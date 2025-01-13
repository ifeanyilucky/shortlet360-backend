const { replace } = require('lodash');
const numeral = require('numeral');

// ----------------------------------------------------------------------

const fCurrency = (number) => {
  const formatted = numeral(number).format(
    Number.isInteger(number) ? `0,0` : `0,0.00`
  );
  return `NGN ${formatted}`;
};

const fPercent = (number) => {
  return numeral(number / 100).format('0.0%');
};

const fNumber = (number) => {
  return numeral(number).format();
};

const fShortenNumber = (number) => {
  return replace(numeral(number).format('0.00a'), '.00', '');
};

const fData = (number) => {
  return numeral(number).format('0.0 b');
};

module.exports = {
  fCurrency,
  fPercent,
  fNumber,
  fShortenNumber,
  fData,
};
