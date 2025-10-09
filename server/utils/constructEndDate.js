function constructEndDate(year, month) {
  const endDate = new Date(Date.UTC(year, month, 0));
  return endDate.toISOString().split('T')[0];
}

module.exports = {
    constructEndDate
}