const pup = require("puppeteer");
require('dotenv').config();
const { sendClockInFailureEmail } = require("./mailer");

const USER_EMAIL = process.env.USER_EMAIL;
const USER_PASSWORD = process.env.USER_PASSWORD;
const BASE_URL = process.env.BASE_URL;
const HOLIDAYS = (process.env.HOLIDAYS || "").split(",").map(d => d.trim());

function isTodayHolidayOrWeekOff() {
    const today = new Date();
    const yyyy_mm_dd = today.toISOString().slice(0, 10);
    const isSunday = today.getDay() === 0;
    const isSaturday = today.getDay() === 6;
    const isHoliday = HOLIDAYS.includes(yyyy_mm_dd);
    console.log('date', today, yyyy_mm_dd);
    console.log('isSaturday', isSaturday);
    console.log('isSunday', isSunday);
    console.log('isHoliday', isHoliday);
    return isSaturday || isSunday || isHoliday;
}

async function main() {
    if (isTodayHolidayOrWeekOff()) {
        console.log("Today is a holiday or WeekOff. Skipping automation.");
        return;
    }
    console.log("Launching browser...");
    // let browser = await pup.launch({
    //     headless: true,
    //     defaultViewport: null,
    //     args: ["--start-maximized"]
    // });

    /**
     * ONLY FOR SERVER
     * server doesn't have GUI, so below settings required
     */
    let browser = await pup.launch({
        executablePath: "/usr/bin/google-chrome",
        headless: "new",
        defaultViewport: null,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage"
        ]
    });


    let pages = await browser.pages();
    const tab = pages[0];

    console.log(`Navigating to ${BASE_URL}`);
    await tab.goto(`${BASE_URL}`, {
        waitUntil: 'networkidle2'
    });

    try {
        // Login
        await tab.type('#UserLogin_username', USER_EMAIL, { delay: 50 });
        await tab.type('#UserLogin_password', USER_PASSWORD, { delay: 50 });
        await tab.click('button[type="submit"]');
        console.log("Logging in...");

        await tab.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
        console.log('successfully logged in !! ');

        // Skip mood modal if it appears
        try {
            await tab.waitForSelector('.skip_pulse', { visible: true, timeout: 5000 });
            await tab.click('.skip_pulse');
            await wait(2000);
            console.log('Mood modal successfully clicked');
        } catch (e) {
            console.log('No mood modal appears');
        }
        await wait(3000);

        // Clock in - Clock out
        console.log("Clicking clock-in/clock-out button...");

        // Wait for the clock-in widget to appear
        await tab.waitForSelector('ui-clock-in-details', { visible: true, timeout: 15000 });

        const clicked = await tab.evaluate(() => {
            // The clock-in button is inside a dbx-ds-button-wrapper with class 'clock-in-btn'
            const btnWrapper = document.querySelector('dbx-ds-button-wrapper.clock-in-btn');
            if (btnWrapper) {
                // Try the inner dbx-ds-button web component's shadow root first
                const dbxBtn = btnWrapper.querySelector('dbx-ds-button');
                if (dbxBtn) {
                    // Shadow DOM button
                    const shadowBtn = dbxBtn.shadowRoot && dbxBtn.shadowRoot.querySelector('button');
                    if (shadowBtn) {
                        shadowBtn.click();
                        return 'shadow-button';
                    }
                    // Fallback: click the host element itself
                    dbxBtn.click();
                    return 'dbx-button-host';
                }
                // Fallback: click the wrapper
                btnWrapper.click();
                return 'wrapper';
            }
            return false;
        });

        if (clicked) {
            console.log(`✅ Clock-in / Clock-out successful! (via ${clicked})`);
            await wait(2000);
        } else {
            console.log("❌ Clock-in failed! Button not found.");
            await sendClockInFailureEmail("Clock-in button not found in the UI.");
        }

    } catch (error) {
        console.error("Error:", error.message);
        await sendClockInFailureEmail(error.message);
    }
    await wait(5000);
    await browser.close();
    console.log('successfully closed the browser');
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();
