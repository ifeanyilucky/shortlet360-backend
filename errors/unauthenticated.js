const CustomAPIError = require('./custom-error');
const { StatusCodes } = require('http-status-codes');

// eslint-disable-next-line require-jsdoc
class UnauthenticatedError extends CustomAPIError {
  /**
   * @param {any} message
   */
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.UNAUTHORIZED;
  }
}

module.exports = UnauthenticatedError;
