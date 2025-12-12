exports.helloWorld = (req, res) => {
  res.status(200).json({
    message: 'Hello World from Controller!',
    success: true,
    timestamp: new Date().toISOString()
  });
};
