/**
 * Reference File Analyzer
 * 
 * Compares captured endpoints against reference file
 * Provides detailed breakdown of missing/extra endpoints by protocol
 */

const fs = require('fs');

class ReferenceAnalyzer {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Load reference file
   */
  loadReference(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        this.logger.warn(`Reference file not found: ${filePath}`);
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const reference = JSON.parse(content);
      
      this.logger.debug(`Loaded reference file with ${reference.length || 0} endpoints`);
      return reference;

    } catch (error) {
      this.logger.error(`Failed to load reference file: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse endpoints by protocol
   */
  parseByProtocol(endpoints) {
    const breakdown = {
      'data:': [],
      'https://': [],
      'http://': [],
      'blob:': [],
      'other': []
    };

    endpoints.forEach(endpoint => {
      const url = typeof endpoint === 'string' ? endpoint : endpoint.url;
      
      if (url.startsWith('data:')) {
        breakdown['data:'].push(url);
      } else if (url.startsWith('https://')) {
        breakdown['https://'].push(url);
      } else if (url.startsWith('http://')) {
        breakdown['http://'].push(url);
      } else if (url.startsWith('blob:')) {
        breakdown['blob:'].push(url);
      } else {
        breakdown['other'].push(url);
      }
    });

    return breakdown;
  }

  /**
   * Compare captured endpoints against reference
   */
  compareWithReference(capturedEndpoints, referenceEndpoints) {
    const comparison = {
      totalCaptured: capturedEndpoints.length,
      totalReference: referenceEndpoints.length,
      matched: 0,
      missing: [],
      extra: [],
      protocolComparison: {}
    };

    // Normalize URLs for comparison
    const capturedSet = new Set(capturedEndpoints.map(e => this.normalizeUrl(e)));
    const referenceSet = new Set(referenceEndpoints.map(e => this.normalizeUrl(e)));

    // Find matched endpoints
    capturedSet.forEach(url => {
      if (referenceSet.has(url)) {
        comparison.matched++;
      }
    });

    // Find missing endpoints
    referenceSet.forEach(url => {
      if (!capturedSet.has(url)) {
        comparison.missing.push(url);
      }
    });

    // Find extra endpoints
    capturedSet.forEach(url => {
      if (!referenceSet.has(url)) {
        comparison.extra.push(url);
      }
    });

    // Compare by protocol
    const capturedByProtocol = this.parseByProtocol(capturedEndpoints);
    const referenceByProtocol = this.parseByProtocol(referenceEndpoints);

    Object.keys(capturedByProtocol).forEach(protocol => {
      comparison.protocolComparison[protocol] = {
        captured: capturedByProtocol[protocol].length,
        reference: referenceByProtocol[protocol].length,
        matched: this.countMatched(
          capturedByProtocol[protocol],
          referenceByProtocol[protocol]
        )
      };
    });

    return comparison;
  }

  /**
   * Count matched endpoints between two lists
   */
  countMatched(list1, list2) {
    const set2 = new Set(list2.map(e => this.normalizeUrl(e)));
    return list1.filter(e => set2.has(this.normalizeUrl(e))).length;
  }

  /**
   * Normalize URL for comparison
   */
  normalizeUrl(url) {
    if (typeof url !== 'string') {
      url = url.url || '';
    }

    // Remove query parameters and fragments for comparison
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch (e) {
      // For data: and blob: URLs, use as-is
      return url.substring(0, 100); // Limit length for comparison
    }
  }

  /**
   * Generate comparison report
   */
  generateReport(comparison) {
    const report = {
      summary: {
        totalCaptured: comparison.totalCaptured,
        totalReference: comparison.totalReference,
        matchPercentage: ((comparison.matched / comparison.totalReference) * 100).toFixed(1),
        missingCount: comparison.missing.length,
        extraCount: comparison.extra.length
      },
      protocolBreakdown: comparison.protocolComparison,
      missingEndpoints: comparison.missing.slice(0, 20), // First 20
      extraEndpoints: comparison.extra.slice(0, 20), // First 20
      recommendations: this.generateRecommendations(comparison)
    };

    return report;
  }

  /**
   * Generate recommendations based on comparison
   */
  generateRecommendations(comparison) {
    const recommendations = [];

    // Check protocol coverage
    Object.entries(comparison.protocolComparison).forEach(([protocol, stats]) => {
      if (stats.reference > 0 && stats.captured === 0) {
        recommendations.push(`Missing all ${protocol} URLs (expected ${stats.reference})`);
      } else if (stats.captured < stats.reference * 0.8) {
        recommendations.push(`Low coverage for ${protocol} URLs: ${stats.captured}/${stats.reference}`);
      }
    });

    // Check overall coverage
    const matchPercentage = (comparison.matched / comparison.totalReference) * 100;
    if (matchPercentage < 50) {
      recommendations.push('Critical: Less than 50% endpoint coverage');
    } else if (matchPercentage < 80) {
      recommendations.push('Warning: Less than 80% endpoint coverage');
    }

    // Check for missing data URLs
    if (comparison.protocolComparison['data:']?.reference > 0 && 
        comparison.protocolComparison['data:']?.captured === 0) {
      recommendations.push('Data URL scanner may not be working - check network-interceptor.js');
    }

    // Check for missing blob URLs
    if (comparison.protocolComparison['blob:']?.reference > 0 && 
        comparison.protocolComparison['blob:']?.captured === 0) {
      recommendations.push('Blob URL interception may not be working - check network-interceptor.js');
    }

    return recommendations;
  }

  /**
   * Print comparison report
   */
  printReport(comparison, logger) {
    const report = this.generateReport(comparison);

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Reference File Comparison Report`);
    logger.info(`${'='.repeat(60)}`);

    logger.info(`\nSummary:`);
    logger.info(`  Total Captured: ${report.summary.totalCaptured}`);
    logger.info(`  Total Reference: ${report.summary.totalReference}`);
    logger.info(`  Match Percentage: ${report.summary.matchPercentage}%`);
    logger.info(`  Missing: ${report.summary.missingCount}`);
    logger.info(`  Extra: ${report.summary.extraCount}`);

    logger.info(`\nProtocol Breakdown:`);
    Object.entries(report.protocolBreakdown).forEach(([protocol, stats]) => {
      if (stats.reference > 0) {
        const percentage = ((stats.captured / stats.reference) * 100).toFixed(1);
        logger.info(`  ${protocol}: ${stats.captured}/${stats.reference} (${percentage}%)`);
      }
    });

    if (report.recommendations.length > 0) {
      logger.info(`\nRecommendations:`);
      report.recommendations.forEach(rec => {
        logger.warn(`  - ${rec}`);
      });
    }

    logger.info(`\n${'='.repeat(60)}\n`);

    return report;
  }
}

module.exports = { ReferenceAnalyzer };

