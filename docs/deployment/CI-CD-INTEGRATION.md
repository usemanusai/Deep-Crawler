# DeepCrawler E2E Testing - CI/CD Integration Guide

## Overview

This guide covers integrating the DeepCrawler E2E test suite into various CI/CD platforms.

## GitHub Actions

### Basic Setup

Create `.github/workflows/deepcrawler-tests.yml`:

```yaml
name: DeepCrawler E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 */6 * * *'  # Run every 6 hours

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Install Playwright
        run: npx playwright install chromium

      - name: Start backend
        run: npm run dev &
        env:
          NODE_ENV: test

      - name: Wait for backend
        run: sleep 5 && curl -f http://localhost:3002 || exit 1

      - name: Run E2E tests
        run: npm run test:e2e
        timeout-minutes: 20

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
          retention-days: 30

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const reports = fs.readdirSync('test-results').filter(f => f.endsWith('.txt'));
            if (reports.length > 0) {
              const report = fs.readFileSync(`test-results/${reports[0]}`, 'utf8');
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## DeepCrawler E2E Test Results\n\`\`\`\n${report}\n\`\`\``
              });
            }
```

### Advanced Setup with Matrix Testing

```yaml
name: DeepCrawler Matrix Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-suite: [miniapps, example]
        node-version: [16, 18, 20]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm install

      - name: Install Playwright
        run: npx playwright install chromium

      - name: Start backend
        run: npm run dev &

      - name: Wait for backend
        run: sleep 5

      - name: Run ${{ matrix.test-suite }} tests
        run: npm run test:e2e:suite -- ${{ matrix.test-suite }}

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: results-${{ matrix.test-suite }}-node${{ matrix.node-version }}
          path: test-results/
```

## GitLab CI

### Basic Setup

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test

deepcrawler_e2e:
  stage: test
  image: node:18
  timeout: 30 minutes
  
  before_script:
    - npm install
    - npx playwright install chromium
    - npm run dev &
    - sleep 5

  script:
    - npm run test:e2e

  artifacts:
    paths:
      - test-results/
    reports:
      junit: test-results/junit.xml
    expire_in: 30 days
    when: always

  retry:
    max: 2
    when:
      - runner_system_failure
      - stuck_or_timeout_failure
```

### Advanced Setup with Multiple Stages

```yaml
stages:
  - build
  - test
  - report

build:
  stage: build
  image: node:18
  script:
    - npm install
    - npm run build
  artifacts:
    paths:
      - .next/
      - node_modules/
    expire_in: 1 hour

test:miniapps:
  stage: test
  image: node:18
  dependencies:
    - build
  script:
    - npx playwright install chromium
    - npm run dev &
    - sleep 5
    - npm run test:e2e:suite -- miniapps
  artifacts:
    paths:
      - test-results/
    when: always

test:example:
  stage: test
  image: node:18
  dependencies:
    - build
  script:
    - npx playwright install chromium
    - npm run dev &
    - sleep 5
    - npm run test:e2e:suite -- example
  artifacts:
    paths:
      - test-results/
    when: always

report:
  stage: report
  image: node:18
  dependencies:
    - test:miniapps
    - test:example
  script:
    - echo "All tests completed"
  when: always
```

## Jenkins

### Declarative Pipeline

```groovy
pipeline {
  agent any
  
  options {
    timeout(time: 30, unit: 'MINUTES')
    timestamps()
  }

  stages {
    stage('Setup') {
      steps {
        sh 'npm install'
        sh 'npx playwright install chromium'
      }
    }

    stage('Start Backend') {
      steps {
        sh 'npm run dev &'
        sh 'sleep 5'
      }
    }

    stage('Run Tests') {
      steps {
        sh 'npm run test:e2e'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'test-results/**', allowEmptyArchive: true
      junit 'test-results/junit.xml'
    }
    failure {
      emailext(
        subject: 'DeepCrawler E2E Tests Failed',
        body: 'Check Jenkins logs for details',
        to: '${DEFAULT_RECIPIENTS}'
      )
    }
  }
}
```

## Azure Pipelines

```yaml
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'

  - script: npm install
    displayName: 'Install dependencies'

  - script: npx playwright install chromium
    displayName: 'Install Playwright'

  - script: npm run dev &
    displayName: 'Start backend'

  - script: sleep 5
    displayName: 'Wait for backend'

  - script: npm run test:e2e
    displayName: 'Run E2E tests'

  - task: PublishBuildArtifacts@1
    condition: always()
    inputs:
      pathToPublish: 'test-results'
      artifactName: 'test-results'
      publishLocation: 'Container'

  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'test-results/junit.xml'
```

## CircleCI

```yaml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:18.0
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: npm install
      - run:
          name: Install Playwright
          command: npx playwright install chromium
      - run:
          name: Start backend
          command: npm run dev
          background: true
      - run:
          name: Wait for backend
          command: sleep 5 && curl -f http://localhost:3002
      - run:
          name: Run E2E tests
          command: npm run test:e2e
      - store_artifacts:
          path: test-results
          destination: test-results

workflows:
  test:
    jobs:
      - test
```

## Travis CI

```yaml
language: node_js
node_js:
  - '18'

before_script:
  - npm install
  - npx playwright install chromium
  - npm run dev &
  - sleep 5

script:
  - npm run test:e2e

after_always:
  - tar -czf test-results.tar.gz test-results/

deploy:
  provider: s3
  access_key_id: $AWS_ACCESS_KEY_ID
  secret_access_key: $AWS_SECRET_ACCESS_KEY
  bucket: my-test-results
  local_dir: test-results
  on:
    branch: main
```

## Environment Variables

### GitHub Actions

```yaml
env:
  BACKEND_URL: http://localhost:3002
  EXTENSION_ID: hegjkinbjlahdpfoglnbilcoofjmfdpp
  VERBOSE: false
```

### GitLab CI

```yaml
variables:
  BACKEND_URL: http://localhost:3002
  EXTENSION_ID: hegjkinbjlahdpfoglnbilcoofjmfdpp
  VERBOSE: "false"
```

## Notifications

### Slack Integration (GitHub Actions)

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "DeepCrawler E2E Tests: ${{ job.status }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*DeepCrawler E2E Tests*\nStatus: ${{ job.status }}"
            }
          }
        ]
      }
```

### Email Notifications (Jenkins)

```groovy
post {
  failure {
    emailext(
      subject: 'DeepCrawler Tests Failed',
      body: '''
        Build failed. Check logs at:
        ${BUILD_URL}console
      ''',
      to: 'team@example.com'
    )
  }
}
```

## Performance Optimization

### Caching

```yaml
# GitHub Actions
- uses: actions/cache@v3
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
```

### Parallel Execution

```yaml
# GitHub Actions Matrix
strategy:
  matrix:
    test-suite: [miniapps, example, custom]
```

## Troubleshooting

### Port Already in Use

```bash
# Kill existing process
lsof -i :3002 | grep -v COMMAND | awk '{print $2}' | xargs kill -9
```

### Playwright Installation Issues

```bash
# Force reinstall
rm -rf ~/.cache/ms-playwright
npx playwright install chromium
```

### Timeout Issues

Increase timeout in CI configuration:

```yaml
# GitHub Actions
timeout-minutes: 45

# GitLab CI
timeout: 45 minutes
```

## Best Practices

1. **Run tests on every push** - Catch regressions early
2. **Use matrix testing** - Test multiple Node versions
3. **Cache dependencies** - Speed up CI runs
4. **Archive results** - Keep test reports for analysis
5. **Set up notifications** - Alert team of failures
6. **Use scheduled runs** - Run tests on a schedule
7. **Parallel execution** - Run multiple test suites simultaneously
8. **Artifact retention** - Keep results for debugging

## Next Steps

1. Choose your CI/CD platform
2. Copy the appropriate configuration
3. Customize for your environment
4. Test the pipeline
5. Set up notifications
6. Monitor test results

