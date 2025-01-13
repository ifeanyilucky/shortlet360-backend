const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const puppeteer = require("puppeteer");
const helpers = require("./hbsHelpers");

// Register all helpers
Object.keys(helpers).forEach((helperName) => {
  handlebars.registerHelper(helperName, helpers[helperName]);
});

async function generatePDF(templateName, data) {
  try {
    // Read the template file
    const templatePath = path.join(__dirname, `../views/${templateName}.hbs`);
    const templateHtml = fs.readFileSync(templatePath, "utf-8");

    // Compile the template
    const template = handlebars.compile(templateHtml);

    // Add logo path to data
    data.logo = "https://shortlet360.com/logo.png"; // Update with your actual logo URL

    // Render the template with data
    const html = template(data);

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox"],
    });

    // Create a new page
    const page = await browser.newPage();

    // Set content to our rendered HTML
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    // Close browser
    await browser.close();

    return pdf;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

module.exports = generatePDF;
