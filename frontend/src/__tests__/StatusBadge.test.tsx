import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { StatusBadge } from '../components/common/StatusBadge';

describe('StatusBadge Component', () => {
  it('renders ON_TRACK badge correctly', () => {
    render(<StatusBadge type="risk" value="ON_TRACK" />);
    expect(screen.getByText('On Track')).toBeDefined();
  });

  it('renders AT_RISK badge correctly', () => {
    render(<StatusBadge type="risk" value="AT_RISK" />);
    expect(screen.getByText('At Risk')).toBeDefined();
  });

  it('renders DELAYED badge correctly', () => {
    render(<StatusBadge type="risk" value="DELAYED" />);
    expect(screen.getByText('Delayed')).toBeDefined();
  });

  it('renders AI Category badge correctly', () => {
    render(<StatusBadge type="category" value="Machine breakdown" />);
    expect(screen.getByText('Machine breakdown')).toBeDefined();
  });
});
