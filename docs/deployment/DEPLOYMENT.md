# DeepCrawler Extension Deployment Guide

This guide covers deploying the DeepCrawler extension to production.

## Pre-Deployment Checklist

- [ ] All tests pass
- [ ] No console errors
- [ ] No security vulnerabilities
- [ ] Documentation is complete
- [ ] Version number is updated
- [ ] Changelog is updated
- [ ] API key is configured
- [ ] Backend URL is correct

## Development Deployment

### Local Testing

1. **Load extension in development mode**:
   ```bash
   # Navigate to chrome://extensions/
   # Enable Developer mode
   # Click "Load unpacked"
   # Select extension folder
   ```

2. **Test all features**:
   - Connection status
   - Settings management
   - Crawling with extension
   - Fallback to server mode
   - Error handling

3. **Check console for errors**:
   - F12 → Console
   - Look for any errors or warnings
   - Fix any issues found

## Production Deployment

### Step 1: Prepare Extension

1. **Update version number**:
   ```json
   // manifest.json
   {
     "version": "1.0.0"
   }
   ```

2. **Update manifest**:
   - Verify all permissions are necessary
   - Remove debug flags
   - Set correct host permissions

3. **Optimize code**:
   - Remove console.log statements (or use conditional logging)
   - Minify JavaScript files
   - Optimize CSS

### Step 2: Create Extension Package

1. **Prepare files**:
   ```bash
   cd extension/
   # Ensure all files are present
   ls -la
   ```

2. **Create ZIP file**:
   ```bash
   zip -r deepcrawler-extension.zip \
     manifest.json \
     background.js \
     content.js \
     popup.html \
     popup.js \
     popup.css \
     options.html \
     options.js \
     options.css \
     README.md
   ```

### Step 3: Submit to Chrome Web Store

1. **Create developer account**:
   - Visit https://chrome.google.com/webstore/devconsole
   - Sign in with Google account
   - Pay one-time developer fee ($5)

2. **Upload extension**:
   - Click "New item"
   - Upload ZIP file
   - Fill in extension details:
     - Name: "DeepCrawler Session Bridge"
     - Description: "Bridge authenticated browser sessions with DeepCrawler"
     - Category: "Productivity"
     - Language: "English"

3. **Add screenshots**:
   - 1280x800 screenshot of popup
   - 1280x800 screenshot of settings
   - 1280x800 screenshot of connection status

4. **Add privacy policy**:
   - Create privacy policy
   - Upload or link to policy
   - Ensure compliance with Chrome Web Store policies

5. **Configure permissions**:
   - Justify each permission
   - Explain why each permission is needed

6. **Submit for review**:
   - Review all information
   - Submit for Chrome Web Store review
   - Wait for approval (typically 1-3 days)

### Step 4: Configure Backend

1. **Set environment variables**:
   ```bash
   # .env
   EXTENSION_API_KEY=your-secure-api-key
   ```

2. **Update API key**:
   - Generate secure random key
   - Update backend configuration
   - Distribute to users

3. **Enable HTTPS**:
   - Use SSL/TLS certificates
   - Update backend URL to HTTPS
   - Update extension settings

### Step 5: Release Notes

Create release notes:

```markdown
# DeepCrawler Extension v1.0.0

## Features
- Session bridge for authenticated crawling
- Real-time connection status
- Configurable crawling modes
- Network request interception
- Automatic fallback to server mode

## Bug Fixes
- Fixed connection timeout issues
- Improved error handling
- Enhanced security

## Known Issues
- None

## Installation
1. Visit Chrome Web Store
2. Search for "DeepCrawler Session Bridge"
3. Click "Add to Chrome"
4. Configure settings
5. Start crawling with authenticated sessions
```

## Post-Deployment

### Monitoring

1. **Monitor extension usage**:
   - Check Chrome Web Store analytics
   - Monitor user reviews
   - Track error reports

2. **Monitor backend**:
   - Check API logs
   - Monitor connection status
   - Track performance metrics

3. **Monitor security**:
   - Check for security issues
   - Monitor for abuse
   - Review user feedback

### Updates

1. **Bug fixes**:
   - Fix reported issues
   - Test thoroughly
   - Release patch version

2. **New features**:
   - Plan new features
   - Implement and test
   - Release minor version

3. **Major updates**:
   - Plan major changes
   - Extensive testing
   - Release major version

## Rollback Procedure

If issues are discovered:

1. **Identify issue**:
   - Check error reports
   - Reproduce issue
   - Determine severity

2. **Prepare rollback**:
   - Revert to previous version
   - Test thoroughly
   - Prepare release notes

3. **Release rollback**:
   - Submit to Chrome Web Store
   - Notify users
   - Document issue

## Support

### User Support

1. **Help documentation**:
   - Maintain FAQ
   - Update troubleshooting guide
   - Provide examples

2. **Issue tracking**:
   - Monitor GitHub issues
   - Respond to user reports
   - Track bugs

3. **Communication**:
   - Announce updates
   - Share roadmap
   - Gather feedback

### Developer Support

1. **Documentation**:
   - Maintain API documentation
   - Update code comments
   - Provide examples

2. **Testing**:
   - Provide test cases
   - Share debugging tips
   - Offer support

## Maintenance

### Regular Tasks

- [ ] Monitor extension usage
- [ ] Review user feedback
- [ ] Check for security issues
- [ ] Update dependencies
- [ ] Test with new Chrome versions
- [ ] Update documentation

### Quarterly Tasks

- [ ] Review analytics
- [ ] Plan new features
- [ ] Update roadmap
- [ ] Security audit
- [ ] Performance review

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0.0 | TBD | Pending | Initial release |

## Contact

For deployment issues or questions:
- Email: support@hyperbrowser.ai
- GitHub: https://github.com/hyperbrowserai
- Docs: https://docs.hyperbrowser.ai

