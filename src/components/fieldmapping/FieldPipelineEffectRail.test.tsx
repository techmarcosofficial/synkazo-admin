import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import FieldPipelineEffectRail, {
  buildStepTrace,
} from './FieldPipelineEffectRail';

describe('FieldPipelineEffectRail', () => {
  afterEach(cleanup);
  it('buildStepTrace executes rules in sequential order', () => {
    const rules = [
      { type: 'trim', enabled: true },
      { type: 'uppercase', enabled: true },
    ];
    const trace = buildStepTrace('  hello world  ', rules);

    expect(trace).toHaveLength(2);
    expect(trace[0].output).toBe('hello world');
    expect(trace[1].output).toBe('HELLO WORLD');
  });

  it('buildStepTrace bypasses disabled rules', () => {
    const rules = [
      { type: 'trim', enabled: true },
      { type: 'uppercase', enabled: false },
    ];
    const trace = buildStepTrace('  hello world  ', rules);

    expect(trace).toHaveLength(2);
    expect(trace[0].output).toBe('hello world');
    expect(trace[1].enabled).toBe(false);
    expect(trace[1].output).toBe('hello world');
  });

  it('renders live pipeline preview and outcome', () => {
    render(
      <FieldPipelineEffectRail
        sourceKey="first_name"
        destKey="firstName"
        sourceFieldDef={{ key: 'first_name', label: 'First Name', type: 'string' }}
        destFieldDef={{ key: 'firstName', label: 'First Name', type: 'string' }}
        rules={[{ type: 'trim', enabled: true }]}
        onEmpty="default"
        defaultValue="Unknown"
        updatePolicy="always"
        isMatch={false}
        hasSkipRule={false}
        skipOperator="equals"
        skipValue=""
      />,
    );

    expect(screen.getByText(/Live Pipeline Effect/i)).toBeInTheDocument();
    expect(screen.getByText(/Sequential Transformation Steps/i)).toBeInTheDocument();
    expect(screen.getByText(/Trim Spaces/i)).toBeInTheDocument();
    expect(screen.getByText(/Ready to Sync/i)).toBeInTheDocument();
  });

  it('reflects skip filter condition trigger', () => {
    render(
      <FieldPipelineEffectRail
        sourceKey="status"
        destKey="Status"
        rules={[]}
        onEmpty="none"
        defaultValue=""
        updatePolicy="always"
        isMatch={false}
        hasSkipRule={true}
        skipOperator="equals"
        skipValue="Inactive"
      />,
    );

    // Initial test input does not match "Inactive"
    expect(screen.getByText(/Passes Filter/i)).toBeInTheDocument();

    // Change test input to "Inactive"
    const input = document.getElementById('rail-test-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Inactive' } });

    // Should now report Triggered and Record Discarded
    expect(screen.getByText(/Triggered \(Skip\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Record Discarded/i)).toBeInTheDocument();
  });
});
