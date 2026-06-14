# Contributing to Peerlytics & USDCToFiat Starters

Thank you for your interest in contributing! This repository provides production-ready examples and SDKs for ZKP2P protocols on Base: server-side analytics with **@peerlytics/sdk** and wallet-native USDC off-ramps with **@usdctofiat/offramp**.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing Workflow](#contributing-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [SDK-Specific Guidelines](#sdk-specific-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Getting Started

### Prerequisites

- **Node.js** v18+ (LTS recommended)
- **npm** or **yarn**
- **Git**
- **Vercel CLI** (optional, for deployment testing)

### Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/usdctofiat-peerlytics-starters.git
   cd usdctofiat-peerlytics-starters
   ```

3. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

4. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the demo**:
   ```bash
   npm run dev
   ```

## Development Setup

### Environment Variables

Create a `.env` file with the following:

```env
# Peerlytics SDK
PEERLYTICS_API_KEY=your_api_key_here
PEERLYTICS_ENVIRONMENT=development

# USDCToFiat Offramp
OFFRAMP_API_KEY=your_offramp_key_here
OFFRAMP_WEBHOOK_SECRET=your_webhook_secret

# Demo App
VITE_PEERLYTICS_KEY=your_public_key
VITE_OFFRAMP_KEY=your_public_key
```

### Project Structure

```
usdctofiat-peerlytics-starters/
├── demo/                      # Vite + React demo application
│   ├── src/
│   │   ├── App.tsx           # Main UI: deposits, orderbook, withdraw
│   │   └── components/
│   ├── api/
│   │   └── orderbook.ts      # Vercel serverless orderbook proxy
│   └── server/
│       └── peerlytics.ts     # Shared Peerlytics server helper
│
├── peerlytics/               # @peerlytics/sdk examples
│   ├── analytics/
│   ├── orderbook/
│   └── README.md
│
├── usdctofiat/              # @usdctofiat/offramp examples
│   ├── deposits/
│   ├── withdrawals/
│   └── README.md
│
└── shared/                  # Common utilities and types
    ├── types/
    └── utils/
```

## Contributing Workflow

### Branch Naming

Follow these conventions for branch names:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/description` | `feat/add-websocket-support` |
| Bug fix | `fix/description` | `fix/orderbook-race-condition` |
| Documentation | `docs/description` | `docs/api-reference` |
| Refactor | `refactor/description` | `refactor/sdk-types` |
| Tests | `test/description` | `test/offramp-edge-cases` |

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short summary>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `sdk`: SDK-specific changes

Example:
```
feat: add real-time orderbook updates via WebSocket

Implements WebSocket connection for live orderbook
updates in the demo application. Reduces polling
overhead and improves UX.
```

### Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following our code style

3. **Test your changes**:
   ```bash
   npm run test
   npm run lint
   npm run typecheck
   ```

4. **Update documentation** if needed

5. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   git push origin feat/your-feature-name
   ```

6. **Open a Pull Request** with:
   - Clear title following commit conventions
   - Description of what changed and why
   - Screenshots/GIFs for UI changes
   - Link to related issues

7. **Request review** from maintainers

8. **Address feedback** and update your PR

## Code Style

### TypeScript

- Use strict TypeScript configuration
- Prefer `const` and `let` over `var`
- Use explicit return types for public functions
- Maximum line length: 100 characters
- Use 2 spaces for indentation

### React Components

```typescript
// Good: Explicit types, clear props interface
interface OrderbookProps {
  pair: string;
  onTrade: (trade: Trade) => void;
}

export const Orderbook: React.FC<OrderbookProps> = ({ pair, onTrade }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  
  useEffect(() => {
    // Implementation
  }, [pair]);
  
  return (
    <div className="orderbook">
      {/* JSX */}
    </div>
  );
};
```

### Error Handling

Always handle errors gracefully, especially for blockchain interactions:

```typescript
try {
  const result = await offramp.createDeposit({
    amount: '100',
    currency: 'USDC'
  });
  return result;
} catch (error) {
  if (error instanceof OfframpError) {
    logger.error('Offramp failed:', error.code, error.message);
    throw new UserFacingError('Unable to process deposit. Please try again.');
  }
  throw error;
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- peerlytics/analytics.test.ts

# Run with coverage
npm run test:coverage
```

### Writing Tests

We use **Jest** and **React Testing Library**:

```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { OfframpClient } from '@usdctofiat/offramp';

describe('OfframpClient', () => {
  it('should create a deposit successfully', async () => {
    const client = new OfframpClient({ apiKey: 'test' });
    const deposit = await client.createDeposit({
      amount: '100',
      currency: 'USDC'
    });
    
    expect(deposit).toHaveProperty('id');
    expect(deposit.amount).toBe('100');
    expect(deposit.status).toBe('pending');
  });

  it('should handle insufficient balance', async () => {
    const client = new OfframpClient({ apiKey: 'test' });
    
    await expect(
      client.createDeposit({ amount: '999999', currency: 'USDC' })
    ).rejects.toThrow('Insufficient balance');
  });
});
```

### Integration Testing

For blockchain interactions, use mocked providers in unit tests and integration tests for critical paths:

```typescript
// Mock blockchain provider
const mockProvider = {
  request: jest.fn().mockResolvedValue({
    jsonrpc: '2.0',
    result: '0x...'
  })
};
```

## SDK-Specific Guidelines

### Peerlytics SDK

When contributing to Peerlytics examples:

- **Privacy first**: Never log sensitive user data
- **Batch requests**: Use batching for multiple analytics calls
- **Error resilience**: Analytics should never break the main flow
- **Type safety**: Use generated types from the SDK

### USDCToFiat Offramp

When contributing to offramp examples:

- **Security**: Validate all webhook signatures
- **Idempotency**: Handle duplicate webhook deliveries gracefully
- **UX**: Provide clear feedback for transaction states
- **Compliance**: Follow KYC/AML patterns in examples

## Documentation

### Code Comments

- Use JSDoc for public APIs
- Explain "why" not "what" (code shows what)
- Keep comments up-to-date with code changes

```typescript
/**
 * Creates a new offramp deposit
 * 
 * @param params - Deposit parameters
 * @param params.amount - Amount in smallest unit (e.g., cents)
 * @param params.currency - Currency code (e.g., 'USDC')
 * @returns Promise resolving to deposit details
 * @throws {OfframpError} If deposit creation fails
 */
async createDeposit(params: DepositParams): Promise<Deposit> {
  // Implementation
}
```

### README Updates

When adding new examples:

1. Update the relevant README.md
2. Add code comments explaining key concepts
3. Include expected output or screenshots
4. Document any required environment variables

## Community

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and ideas
- **Discord**: Join the Base and ZKP2P communities

### Reporting Bugs

When reporting bugs, please include:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Minimal steps to reproduce
- **Expected vs Actual**: What you expected vs what happened
- **Environment**: Node.js version, OS, browser
- **Logs**: Relevant error messages or console logs
- **Screenshots**: If applicable

### Requesting Features

When requesting features:

- Describe the use case
- Explain how it benefits the community
- Provide examples if possible
- Be open to discussion about implementation

## Security

### Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead, email security concerns to the maintainers privately.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Best Practices

- Never commit private keys or API keys
- Use environment variables for sensitive data
- Validate all external inputs
- Follow OWASP guidelines for web applications
- Be cautious with blockchain transactions

## Recognition

Contributors will be recognized in our release notes and documentation. Significant contributions may be highlighted in the project's README.

---

Thank you for helping build better ZKP2P tooling on Base! 🚀
