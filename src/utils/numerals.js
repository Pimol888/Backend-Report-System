const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";

function toLatinDigits(input) {
  if (input === undefined || input === null) return "";
  return String(input).replace(/[០-៩]/g, (d) => String(KHMER_DIGITS.indexOf(d)));
}

function digitsOnlyLatin(input) {
  return toLatinDigits(input).replace(/[^0-9]/g, "");
}

module.exports = { toLatinDigits, digitsOnlyLatin };

