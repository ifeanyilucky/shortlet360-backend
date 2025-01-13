const { format, formatDistanceToNow } = require("date-fns");

const fDate = (date) => {
  return format(new Date(date), "dd MMMM yyyy");
};

const fDateTime = (date) => {
  return format(new Date(date), "dd MMM yyyy HH:mm");
};

const fDateTimeSuffix = (date) => {
  return format(new Date(date), "dd/MM/yyyy hh:mm p");
};

const fToNow = (date) => {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
  });
};

module.exports = { fDate, fToNow, fDateTimeSuffix, fDateTime };
