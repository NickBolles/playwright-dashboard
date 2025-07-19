# GitHub Actions Workflows

This directory contains the GitHub Actions workflows for the Playwright Orchestrator project. The workflows are designed to provide comprehensive CI/CD, security, and performance monitoring.

## Workflows Overview

### 1. CI/CD Pipeline (`ci-cd.yml`)

The main CI/CD pipeline that runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- **Lint**: Runs ESLint and Prettier checks
- **Type Check**: Performs TypeScript type checking
- **Unit Tests**: Runs Vitest unit tests with coverage
- **E2E Tests**: Runs Playwright end-to-end tests with PostgreSQL service
- **Build**: Builds all packages and uploads artifacts
- **Docker Build**: Builds Docker images (main branch only)
- **Deploy Staging**: Deploys to staging environment (develop branch)
- **Deploy Production**: Deploys to production environment (main branch)

### 2. Security Checks (`security.yml`)

Comprehensive security scanning and vulnerability detection.

**Jobs:**
- **Dependency Scan**: Runs npm audit and Snyk security scans
- **CodeQL Analysis**: GitHub's semantic code analysis for security vulnerabilities
- **Container Scan**: Trivy vulnerability scanner for Docker images

### 3. Release Management (`release.yml`)

Automated release creation when tags are pushed.

**Features:**
- Automatic release creation from git tags
- Build artifact uploads
- Changelog generation from git commits
- Release notes updates

### 4. Dependabot Auto-merge (`dependabot.yml`)

Automatically enables auto-merge for Dependabot PRs when all checks pass.

### 5. Performance Tests (`performance.yml`)

Performance monitoring and load testing.

**Jobs:**
- **Load Testing**: Artillery-based load testing
- **Bundle Size Analysis**: Monitors bundle sizes and reports on PRs
- **Memory Monitoring**: Tracks memory usage of running services

## Configuration

### Environment Variables

The following environment variables need to be configured in your GitHub repository settings:

- `SNYK_TOKEN`: Snyk API token for security scanning
- `DATABASE_URL`: Database connection string for tests
- Any deployment-specific environment variables

### Secrets

Configure these secrets in your GitHub repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `SNYK_TOKEN`: Your Snyk API token
   - `DOCKER_USERNAME`: Docker Hub username (if using Docker Hub)
   - `DOCKER_PASSWORD`: Docker Hub password (if using Docker Hub)
   - Any deployment credentials

### Branch Protection Rules

Set up branch protection rules for `main` and `develop` branches:

1. Go to Settings → Branches
2. Add rule for `main` and `develop`
3. Enable:
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Require pull request reviews before merging
   - Include administrators

## Workflow Triggers

| Workflow | Trigger | Branches |
|----------|---------|----------|
| CI/CD | Push, PR | main, develop |
| Security | Push, PR, Weekly | main, develop |
| Release | Tag push | v* |
| Dependabot | PR | All |
| Performance | Push, PR, Daily | main, develop |

## Customization

### Adding New Jobs

To add a new job to an existing workflow:

1. Open the workflow file (e.g., `ci-cd.yml`)
2. Add a new job under the `jobs` section
3. Define the job steps and requirements

### Modifying Deployment

The deployment jobs in `ci-cd.yml` are placeholders. Replace the deployment commands with your actual deployment logic:

```yaml
- name: Deploy to production
  run: |
    # Add your deployment commands here
    # Example: kubectl apply, docker-compose up, etc.
```

### Adding New Environments

To add new environments (e.g., testing, staging):

1. Add environment configuration in GitHub repository settings
2. Create new deployment jobs in `ci-cd.yml`
3. Configure environment-specific variables and secrets

## Monitoring and Debugging

### Workflow Logs

- View workflow runs in the "Actions" tab of your repository
- Download artifacts from completed workflows
- Check job logs for debugging

### Common Issues

1. **Dependency Installation Fails**: Check pnpm-lock.yaml is up to date
2. **Tests Fail**: Verify test environment setup and database configuration
3. **Build Fails**: Check TypeScript compilation errors
4. **Deployment Fails**: Verify environment variables and secrets

### Performance Optimization

- Use pnpm caching for faster dependency installation
- Parallel job execution where possible
- Optimize Docker layer caching
- Use matrix builds for testing multiple Node.js versions

## Best Practices

1. **Keep workflows fast**: Use caching and parallel execution
2. **Fail fast**: Put quick checks (lint, type-check) first
3. **Use specific versions**: Pin action versions for stability
4. **Security first**: Run security scans early in the pipeline
5. **Monitor performance**: Regular performance testing and monitoring
6. **Document changes**: Update this README when modifying workflows

## Support

For issues with GitHub Actions:

1. Check the workflow logs for error details
2. Verify environment variables and secrets are configured
3. Test workflows locally using [act](https://github.com/nektos/act)
4. Review GitHub Actions documentation and community resources