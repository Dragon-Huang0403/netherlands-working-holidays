require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const { connect } = require('puppeteer-real-browser');

console.log('>>> process.env.GIVEN_NAME', process.env.GIVEN_NAME);
console.log('>>> process.env.SURNAME', process.env.SURNAME);
console.log('>>> process.env.CONTACT_NUMBER', process.env.CONTACT_NUMBER);
console.log('>>> process.env.EMAIL', process.env.EMAIL);

const DEFAULT_TIMEOUT = 30_000;

async function waitUntil(time) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const now = new Date();
      console.log('>>> now', now);
      if (now.getTime() >= time.getTime()) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

async function main({ time }) {
  let browser;
  let page;
  const id = uuidv4();
  try {
    const result = await connect({
      headless: false,

      args: [],

      customConfig: {},

      turnstile: true,

      connectOption: {},

      disableXvfb: false,
      ignoreAllFlags: false,
      // proxy:{
      //     host:'<proxy-host>',
      //     port:'<proxy-port>',
      //     username:'<proxy-username>',
      //     password:'<proxy-password>'
      // }
    });
    browser = result.browser;
    page = result.page;

    page.setDefaultTimeout(DEFAULT_TIMEOUT);

    await page.goto(
      'https://www.vfsvisaonline.com/Netherlands-Global-Online-Appointment_Zone1/AppScheduling/AppWelcome.aspx?P=MFP473ItCItb4yBJMHJTzYOHSaUdzN3akY1m1imTU80%3D'
    );
    await page.waitForNavigation();

    await waitUntil(time);

    /**
     * Step 0: Make an appointment
     */
    {
      await page
        .locator('::-p-aria(Make an appointment[role=\\"link\\"])')
        .click();
      await page.waitForNavigation();
    }

    /**
     * Step 1: Select the application type
     */
    {
      await page.select(
        '::-p-aria(-Select-) >>>> ::-p-aria([role=\\"combobox\\"])',
        '923' // 923 = working holiday program
      );
      await page.locator('#plhMain_btnSubmit').click();
      await page.waitForNavigation();
    }

    /**
     * Step 2: Fill the form
     */
    {
      await page.select('#plhMain_repAppVisaDetails_cboTitle_0', 'MR.');
      await page
        .locator('#plhMain_repAppVisaDetails_tbxFName_0')
        .fill(process.env.GIVEN_NAME);
      await page
        .locator('#plhMain_repAppVisaDetails_tbxLName_0')
        .fill(process.env.SURNAME);
      await page
        .locator('#plhMain_repAppVisaDetails_tbxContactNumber_0')
        .fill(process.env.CONTACT_NUMBER);
      await page
        .locator('#plhMain_repAppVisaDetails_tbxEmailAddress_0')
        .fill(process.env.EMAIL);
      await page.select('#plhMain_cboConfirmation', '1'); // confirm the above statement
      await page.locator('#plhMain_btnSubmit').click();
      await page.waitForNavigation();
    }

    /**
     * Step 3: Select a available date
     */
    {
      let availableDates = await page.$$('.OpenDateAllocated');
      if (availableDates.length === 0) {
        await page.locator('a[title="Go to the next month"]').click();
        await page.waitForNavigation();
        availableDates = await page.$$('.OpenDateAllocated');
      }
      const availableDate =
        availableDates[Math.floor(Math.random() * availableDates.length)];
      await availableDate.click();
      await page.waitForNavigation();
    }

    /**
     * Step 4: Select a available time and confirm the appointment
     */
    {
      const availableTimes = await page.$$('#plhMain_gvSlot a');
      const availableTime =
        availableTimes[Math.floor(Math.random() * availableTimes.length)];

      page.on('dialog', async (dialog) => {
        console.log(`Confirm detected: ${dialog.message()}`);
        await dialog.accept();
      });

      await availableTime.click();
    }

    /**
     * Step 5: Get the table data
     */
    await page.waitForNavigation();
    await page.screenshot({ path: `./result-${id}.png` });

    const tableData = await page.evaluate(() => {
      const table = document.querySelector('#dgApplett');
      if (!table) return [];

      const rows = Array.from(table.querySelectorAll('tr'));
      return rows.map((row) => {
        return Array.from(row.querySelectorAll('td')).map((cell) =>
          cell.innerText.trim()
        );
      });
    });
    console.log('Extracted Table Data:');
    console.table(tableData);
  } catch (error) {
    console.error(error);
  } finally {
    // await browser.close();
  }
}

async function runManyTimes(n) {
  const promises = [];
  for (let i = 0; i < n; i++) {
    promises.push(main({ time: new Date('2025-04-01 14:30:00') }));
    promises.push(main({ time: new Date('2025-04-01 14:30:01') }));
  }

  await Promise.all(promises);
}

runManyTimes(3);
