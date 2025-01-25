function sendResponse(res, statusCode, message, data = null) {
    res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }
  
  function sendError(res, statusCode, message) {
    res.status(statusCode).json({
      success: false,
      message
    });
  }
  
  module.exports = {
    sendResponse,
    sendError
  };