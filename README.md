# Asset Management with AWS Secrets Manager

This project demonstrates a secure approach to managing sensitive dependencies using AWS CDK for Terraform (CDKTF) and AWS Secrets Manager. It enables organizations to implement a separation of concerns between teams that manage secrets and teams that develop applications.

## Overview

The system consists of two main components:

1. **DependencyStack**: Used by security/ops teams to safely store sensitive configuration data (like database credentials, API keys, etc.) in AWS Secrets Manager.
2. **Application Stack**: Used by development teams to access these secrets without direct exposure to the sensitive values.

## Security Benefits

- Developers don't need direct access to sensitive credentials
- Reduced risk of secret leakage through developer environments
- Centralized secret management
- Integration with AWS IAM for access control
- Audit trail through AWS CloudTrail

## Prerequisites

- Node.js (14.x or later)
- AWS CLI configured with appropriate credentials
- Terraform CLI
- CDKTF CLI

## Environment Variables

The following environment variables are required:
```
AWS_ACCOUNT_ID=your-aws-account-id
AWS_REGION=your-aws-region
BACKEND_BUCKET=your-terraform-state-bucket
INSTALL_DEPENDENCIES=true|false
```
## Project Structure

AssetManagement/
├── src/
│ ├── lib/
│ │ ├── BaseStack/ # Base infrastructure stack
│ │ └── DependencyStack/ # Secret management stack
│ └── main.ts # Main application entry point

## Usage

### For Security/Operations Teams

1. Set up the dependencies by running with `INSTALL_DEPENDENCIES=true`:

```
{
    "assetId": {
    "DATABASE": {
        "url": "https://example.com",
        "username": "admin",
        "password": "password"
    },
    "SENTRY": {
        "dsn": "https://example.com"
    }
    }
}
```

2. Access secrets in your code:
```
const database = this.getAsset("assetId", Dependencies.DATABASE);
const url = database('url');
const username = database('username');
```

## Available Dependencies

The system currently supports two types of dependencies:

1. **DATABASE**
   - url
   - username
   - password

2. **SENTRY**
   - dsn

## Adding New Dependency Types

1. Add the new dependency type to `Dependencies` enum in `BaseStack/types.ts`
2. Update the `DependecyAttributes` interface with the new dependency structure
3. Update the dependency configuration in your deployment
