function logError(message, error) {
	console.error(new Date().toISOString());
	console.error(message);
	if (error != undefined) { console.error(error); }
}

module.exports = logError;
