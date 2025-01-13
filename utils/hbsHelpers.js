const { format } = require("date-fns");

module.exports = {
  capitalize: (str) => {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  formatDate: (date) => {
    return format(new Date(date), "dd MMM yy");
  },

  formatCurrency: (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  },

  currentYear: () => {
    return new Date().getFullYear();
  },
};
