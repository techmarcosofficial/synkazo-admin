import { describe, expect, it } from 'vitest';

import {
  analyzeRecordDiagnosis,
  extractOffendingField,
  parseSkipRuleDetails,
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

    it('extracts field from "Destination validation failed for field <fieldName>" pattern', () => {
      const rec: SyncLogRecord = {
        id: 'rec-6',
        action: 'failed',
        sourceRecordId: '106',
        failReason: 'validation_error',
        failReasonDetail:
          'Destination validation failed for field "dealstage": Value "lead" is not valid for stage',
      };

      const result = extractOffendingField(rec);
      expect(result.field).toBe('dealstage');
      expect(result.isMissing).toBe(false);
    });

    it('extracts field from "Offending field: <fieldName>" pattern', () => {
      const rec: SyncLogRecord = {
        id: 'rec-7',
        action: 'failed',
        sourceRecordId: '107',
        failReason: 'validation_error',
        failReasonDetail:
          "One of the mapped field values was rejected by Destination's data validation rules. Offending field: dealstage",
      };

      const result = extractOffendingField(rec);
      expect(result.field).toBe('dealstage');
      expect(result.isMissing).toBe(false);
    });

    it('extracts field from top-level destResponse context.propertyName', () => {
      const rec: SyncLogRecord = {
        id: 'rec-8',
        action: 'failed',
        sourceRecordId: '108',
        destResponse: {
          message: 'Invalid property value',
          context: { propertyName: ['pipeline_id'] },
        },
      };

      const result = extractOffendingField(rec);
      expect(result.field).toBe('pipeline_id');
      expect(result.isMissing).toBe(false);
    });
  });

  describe('parseSkipRuleDetails', () => {
    it('parses source condition with property and actual record value', () => {
      const text =
        'Source skip conditions matched (logic=OR; matched 1 of 2): status equals "Cancelled" (record status: "Cancelled")';
      const result = parseSkipRuleDetails(text);

      expect(result.logic).toBe('Match Any');
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toMatchObject({
        property: 'status',
        rule: 'status equals "Cancelled"',
        recordValue: 'Cancelled',
      });
    });

    it('parses multiple source conditions with record values', () => {
      const text =
        'Source skip conditions matched (logic=AND; matched 2 of 2): status equals "Cancelled" (record status: "Cancelled"); amount less than "10" (record amount: "5")';
      const result = parseSkipRuleDetails(text);

      expect(result.logic).toBe('Match All');
      expect(result.rules).toHaveLength(2);
      expect(result.rules[0].property).toBe('status');
      expect(result.rules[0].recordValue).toBe('Cancelled');
      expect(result.rules[1].property).toBe('amount');
      expect(result.rules[1].recordValue).toBe('5');
    });

    it('parses destination condition with source and dest values', () => {
      const text =
        'Destination skip conditions matched (logic=ALL; matched 1): email → email is different from destination (source: "a@b.com", destination: "b@c.com")';
      const result = parseSkipRuleDetails(text);

      expect(result.logic).toBe('Match All');
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].property).toBe('email → email');
      expect(result.rules[0].destProperty).toBe('email');
      expect(result.rules[0].recordValue).toBe('source: a@b.com');
      expect(result.rules[0].expectedValue).toBe('dest: b@c.com');
    });

    it('returns empty rules when detail string is empty or undefined', () => {
      const result = parseSkipRuleDetails(undefined);
      expect(result.rules).toEqual([]);
      expect(result.logic).toBeUndefined();
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

    it('produces 0 actions for skipped records with skip_rule', () => {
      const rec: SyncLogRecord = {
        id: 'rec-5',
        action: 'skipped',
        sourceRecordId: '105',
        skipReason: 'filter_excluded',
        skipReasonDetail:
          'Source skip conditions matched (logic=OR; matched 1 of 2): status equals "Cancelled" (record status: "Cancelled")',
      };

      const diag = analyzeRecordDiagnosis(rec);
      expect(diag.category).toBe('skip_rule');
      expect(diag.summary).toBe('Skip rule: status equals "Cancelled"');
      expect(diag.actions).toHaveLength(0);
      expect(diag.skipLogic).toBe('Match Any');
      expect(diag.skipRules).toHaveLength(1);
      expect(diag.skipRules?.[0].property).toBe('status');
      expect(diag.skipRules?.[0].recordValue).toBe('Cancelled');
      expect(diag.humanExplanation).toContain('status equals "Cancelled"');
    });

    it('includes offending field in validation error summary and human explanation', () => {
      const rec: SyncLogRecord = {
        id: 'rec-6',
        action: 'failed',
        sourceRecordId: '106',
        failReason: 'validation_error',
        failReasonDetail:
          "One of the mapped field values was rejected by Destination's data validation rules. Offending field: dealstage",
      };

      const diag = analyzeRecordDiagnosis(rec, {
        destPlatform: 'hubspot',
      });

      expect(diag.category).toBe('validation_error');
      expect(diag.offendingField).toBe('dealstage');
      expect(diag.summary).toBe('Invalid value for "dealstage"');
      expect(diag.humanExplanation).toBe(
        'The value provided for "dealstage" was rejected by HubSpot\'s data validation rules.',
      );
      expect(diag.actions[0].deepLink).toEqual({
        tab: 'field-mapping',
        field: 'dealstage',
        action: 'transforms',
      });
    });
  });
});
