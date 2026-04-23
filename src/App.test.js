import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders nav with MedCodeIQ branding', () => {
  render(<MemoryRouter><App /></MemoryRouter>);
  expect(screen.getByText(/MedCodeIQ/i)).toBeInTheDocument();
  expect(screen.getByText(/Review queue/i)).toBeInTheDocument();
  expect(screen.getByText(/SMQ explorer/i)).toBeInTheDocument();
});
