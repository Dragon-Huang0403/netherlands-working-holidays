require('dotenv').config();

const { connect } = require('puppeteer-real-browser');

console.log('>>> process.env.GIVEN_NAME', process.env.GIVEN_NAME);
console.log('>>> process.env.SURNAME', process.env.SURNAME);
console.log('>>> process.env.CONTACT_NUMBER', process.env.CONTACT_NUMBER);
console.log('>>> process.env.EMAIL', process.env.EMAIL);

const DEFAULT_TIMEOUT = 10_000;

async function main() {
  let browser;
  let page;
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
        '901' // 923 = working holiday program
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
        // await dialog.accept();
        await dialog.dismiss();
      });

      await availableTime.click();
    }
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
}

async function runManyTimes(n) {
  await Promise.all(Array(n).fill(0).map(main));
}

runManyTimes(3);
