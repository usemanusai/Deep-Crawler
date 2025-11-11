/**
 * Test Orchestrator
 * 
 * Coordinates test execution with:
 * - Error detection and recovery
 * - Reference file comparison
 * - Comprehensive diagnostics
 * - Multi-test suite management
 */

const { FailureDetector, DiagnosticAnalyzer, RecoveryManager } = require('./error-detection');
const { ReferenceAnalyzer } = require('./reference-analyzer');

class TestOrchestrator {
  constructor(logger, config) {
    this.logger = logger;
    this.config = config;
    this.failureDetector = new FailureDetector(logger);
    this.diagnosticAnalyzer = new DiagnosticAnalyzer(logger);
    this.recoveryManager = new RecoveryManager(logger, config);
    this.referenceAnalyzer = new ReferenceAnalyzer(logger);
  }

  /**
   * Execute test with full orchestration
   */
  async executeTest(testFunction, testConfig) {
    const testResults = {
      testId: testConfig.id || 'default',
      testName: testConfig.name || 'Unnamed Test',
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      status: 'PENDING',
      attempts: [],
      finalResult: null,
      diagnostics: {
        failures: [],
        recoveries: [],
        recommendations: []
      }
    };

    let attempt = 0;
    let success = false;

    while (attempt < (this.config.maxRetries || 3) && !success) {
      attempt++;
      const attemptResult = {
        attemptNumber: attempt,
        startTime: Date.now(),
        endTime: null,
        duration: 0,
        status: 'PENDING',
        result: null,
        failures: [],
        recoveries: []
      };

      try {
        this.logger.info(`\n=== Test Attempt ${attempt}/${this.config.maxRetries || 3} ===`);

        // Execute test
        const result = await testFunction(testConfig);
        attemptResult.result = result;
        attemptResult.status = 'COMPLETED';

        // Analyze result for failures
        const failures = await this.detectFailures(result, testConfig);
        
        if (failures.length > 0) {
          attemptResult.failures = failures;
          testResults.diagnostics.failures.push(...failures);

          // Attempt recovery
          for (const failure of failures) {
            const recovered = await this.recoveryManager.attemptRecovery(
              failure,
              `${testConfig.id}-${failure.name}`
            );

            if (recovered) {
              attemptResult.recoveries.push({
                failureMode: failure.name,
                recovered: true
              });
              testResults.diagnostics.recoveries.push(failure.name);
            } else {
              attemptResult.recoveries.push({
                failureMode: failure.name,
                recovered: false
              });
            }
          }

          // If critical failures and no recovery, fail attempt
          const criticalFailures = failures.filter(f => f.severity === 'CRITICAL');
          if (criticalFailures.length > 0 && !attemptResult.recoveries.some(r => r.recovered)) {
            throw new Error(`Critical failures detected: ${criticalFailures.map(f => f.name).join(', ')}`);
          }
        } else {
          success = true;
          attemptResult.status = 'SUCCESS';
        }

      } catch (error) {
        attemptResult.status = 'FAILED';
        attemptResult.error = error.message;
        this.logger.error(`Attempt ${attempt} failed: ${error.message}`);

        if (attempt < (this.config.maxRetries || 3)) {
          const delay = this.config.retryDelay || 5;
          this.logger.info(`Retrying in ${delay}s...`);
          await this.sleep(delay * 1000);
        }
      } finally {
        attemptResult.endTime = Date.now();
        attemptResult.duration = (attemptResult.endTime - attemptResult.startTime) / 1000;
        testResults.attempts.push(attemptResult);
      }
    }

    testResults.endTime = Date.now();
    testResults.duration = (testResults.endTime - testResults.startTime) / 1000;
    testResults.status = success ? 'PASS' : 'FAIL';
    testResults.finalResult = testResults.attempts[testResults.attempts.length - 1]?.result;

    // Generate recommendations
    testResults.diagnostics.recommendations = this.generateRecommendations(testResults);

    return testResults;
  }

  /**
   * Detect failures in test result
   */
  async detectFailures(result, testConfig) {
    const failures = [];

    // Check extension connection
    if (!result.diagnostics?.extensionConnected) {
      const failure = this.failureDetector.detectExtensionConnectionFailure(
        null,
        testConfig.extensionConnectionTimeout || 10
      );
      failures.push(failure);
    }

    // Check endpoint capture
    if (result.results?.endpointsCaptured === 0 && result.testRun?.duration > 30) {
      const failure = this.failureDetector.detectZeroEndpointsCapture(
        0,
        result.testRun.duration
      );
      failures.push(failure);
    }

    // Check navigation
    if (!result.diagnostics?.navigatedToTarget) {
      const failure = this.failureDetector.detectExtensionNotNavigating(
        null,
        testConfig.targetUrl,
        result.testRun?.duration || 0
      );
      failures.push(failure);
    }

    // Check for polling errors
    if (result.logs?.terminal?.includes('404')) {
      const failure = this.failureDetector.detectPollingErrors(result.logs.terminal);
      failures.push(failure);
    }

    // Check for insufficient endpoints
    if (result.results?.endpointsCaptured < testConfig.expectedMinEndpoints) {
      const failure = this.failureDetector.detectInsufficientEndpoints(
        result.results.endpointsCaptured,
        testConfig.expectedMinEndpoints
      );
      failures.push(failure);
    }

    return failures;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(testResults) {
    const recommendations = [];

    // Analyze failures
    testResults.diagnostics.failures.forEach(failure => {
      const analysis = this.diagnosticAnalyzer.analyzeFailure(failure, {});
      
      if (analysis.recommendations.length > 0) {
        recommendations.push(...analysis.recommendations);
      }

      if (!analysis.canRecover) {
        recommendations.push(`${failure.name} cannot be automatically recovered - manual intervention required`);
      }
    });

    // Check retry count
    if (testResults.attempts.length > 1) {
      recommendations.push(`Test required ${testResults.attempts.length} attempts - consider investigating root cause`);
    }

    // Check duration
    if (testResults.duration > 180) {
      recommendations.push(`Test took ${testResults.duration.toFixed(1)}s - consider optimizing crawl parameters`);
    }

    return recommendations;
  }

  /**
   * Execute multiple tests in sequence
   */
  async executeTestSuite(testFunction, testConfigs) {
    const suiteResults = {
      suiteName: 'Test Suite',
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      totalTests: testConfigs.length,
      passedTests: 0,
      failedTests: 0,
      testResults: []
    };

    for (const testConfig of testConfigs) {
      const result = await this.executeTest(testFunction, testConfig);
      suiteResults.testResults.push(result);

      if (result.status === 'PASS') {
        suiteResults.passedTests++;
      } else {
        suiteResults.failedTests++;
      }
    }

    suiteResults.endTime = Date.now();
    suiteResults.duration = (suiteResults.endTime - suiteResults.startTime) / 1000;

    return suiteResults;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { TestOrchestrator };

