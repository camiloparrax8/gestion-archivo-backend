function notFound(req, res) {
  res.status(404).json({
    error: {
      message: `No encontrado: ${req.method} ${req.originalUrl}`,
    },
  });
}

module.exports = notFound;
