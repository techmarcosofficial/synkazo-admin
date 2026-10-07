import { describe, expect, it } from 'vitest';

import {
  analyzeRecordDiagnosis,
  extractOffendingField,
} from './recordDiagnosis';

import type { SyncLogRecord } from '@/types';

describe('recordDiagnosis', () => {
  describe('extractOffendingField', () => {
    it('extracts field from HubSpot required error in destResponse', () => {
      const rec: SyncLogRecord = {
        id: 'rec-1',
        action: 'failed',
        sourceRecordId: '101',
        failReason: 'api_error',
        failReasonDetail: 'Record rejected',
        destResponse: JSON.stringify({
          status: 'error',
          message: 'Property values were not valid',
          errors: [
            {
              message: 'Missing required property: dealname',
              context: { propertyName: ['dealname'] },
            },
          ],
        }),
      };

      const result = extractOffendingField(rec);
      expect(result.field).toBe('dealname');
      expect(result.isMissing).toBe(true);
    });

    it('extracts field from Salesforce REQUIRED_FIELD_MISSING response', () => {
      const rec: SyncLogRecord = {
        id: 'rec-2',
        action: 'failed',
        sourceRecordId: '102',
        destResponse: {
          message: 'Required fields are missing: [LastName]',
          errorCode: 'REQUIRED_FIELD_MISSING',
          fields: ['LastName'],
        },
      };

      const result = extractOffendingField(rec);
      expect(result.field).toBe('LastName');
      expect(result.isMissing).toBe(true);
    });

    it('extracts field from ServiceTitan validation error dictionary', () => {
      const rec: SyncLogRecord = {
        id: 'rec-3',
        action: 'failed',
        sourceRecordId: '103',
        destResponse: {
          title: 'One or more validation errors occurred.',
          errors: {
            jobTypeId: ['The jobTypeId field is required.'],
          },
        },
      };

      const result = extractOffendingField(rec);
      expect(result.field).toBe('jobTypeId');
      expect(result.isMissing).toBe(true);
    });

    it('extracts field from Zoho api_name detail', () => {
      const rec: SyncLogRecord = {
        id: 'rec-4',
        action: 'failed',
        sourceRecordId: '104',
        destResponse: {
          code: 'MANDATORY_NOT_FOUND',
          details: { api_name: 'Last_Name' },
        },
      };

      const result = extractOffendingField(rec);
      expect(result.field).toBe('Last_Name');
      expect(result.isMissing).toBe(true);
    });

    it('extracts field from regex in failReasonDetail string', () => {
      const rec: SyncLogRecord = {
        id: 'rec-5',
        action: 'failed',
        sourceRecordId: '105',
        failReason: 'validation_error',
        failReasonDetail: "Invalid email address for property 'email'",
      };

      const result = extractOffendingField(rec);
      expect(result.field).toBe('email');
      expect(result.isMissing).toBe(false);
    });
  });

  describe('analyzeRecordDiagnosis', () => {
    it('produces deep-link actions for missing required field', () => {
      const rec: SyncLogRecord = {
        id: 'rec-1',
        action: 'failed',
        sourceRecordId: '101',
        failReason: 'missing_required_field',
        failReasonDetail: 'Missing required property: dealname',
      };

      const diag = analyzeRecordDiagnosis(rec, {
        destPlatform: 'hubspot',
        destObject: 'deal',
      });

      expect(diag.category).toBe('missing_required_field');
      expect(diag.offendingField).toBe('dealname');
      expect(diag.humanExplanation).toContain('HubSpot requires "dealname"');
      expect(diag.actions).toHaveLength(2);
      expect(diag.actions[0].deepLink).toEqual({
        tab: 'field-mapping',
        field: 'dealname',
        action: 'fallbacks',
      });
      expect(diag.actions[1].deepLink).toEqual({
        tab: 'field-mapping',
        field: 'dealname',
        action: 'skips',
      });
    });

    it('produces deep-link actions for validation error on phone format', () => {
      const rec: SyncLogRecord = {
        id: 'rec-2',
        action: 'failed',
        sourceRecordId: '102',
        failReason: 'validation_error',
        failReasonDetail: "Property 'phone' has an invalid format",
      };

      const diag = analyzeRecordDiagnosis(rec, {
        destPlatform: 'hubspot',
      });

      expect(diag.category).toBe('validation_error');
      expect(diag.offendingField).toBe('phone');
      expect(diag.actions[0].deepLink).toEqual({
        tab: 'field-mapping',
        field: 'phone',
        action: 'transforms',
      });
    });

    it('produces connection reconnect action for auth errors', () => {
      const rec: SyncLogRecord = {
        id: 'rec-3',
        action: 'failed',
        sourceRecordId: '103',
        failReason: 'auth_error',
        failReasonDetail: '401 Unauthorized token expired',
      };

      const diag = analyzeRecordDiagnosis(rec, {
        destPlatform: 'hubspot',
      });

      expect(diag.category).toBe('auth_error');
      expect(diag.actions[0].destination).toBe('connections');
    });

    it('produces deep-link action for duplicate match identifier review', () => {
      const rec: SyncLogRecord = {
        id: 'rec-4',
        action: 'skipped',
        sourceRecordId: '104',
        skipReason: 'duplicate',
        skipReasonDetail: 'Multiple source records matched the same HubSpot ID',
      };

      const diag = analyzeRecordDiagnosis(rec);

      expect(diag.category).toBe('duplicate_conflict');
      expect(diag.actions[0].deepLink).toEqual({
        tab: 'field-mapping',
        action: 'identity',
      });
    });
  });
});
