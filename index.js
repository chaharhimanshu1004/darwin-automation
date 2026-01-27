const pup = require("puppeteer");
require('dotenv').config();

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
            "--disable-dev-shm-usage",
            "--disable-gpu"
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
        const clicked = await tab.evaluate(() => {
            const spanParent = document.querySelector('.show_clock_popover');
            if (spanParent) {
                const link = spanParent.querySelector('a');
                if (link) {
                    link.click();
                    return true;
                }
            }
            return false;
        });

        if (clicked) {
            console.log("✅ Clock-in / ✅ clock-out successful!");
            await wait(2000);
        } else {
            console.log("❌ Clock-in failed!");
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
    await wait(5000);
    await browser.close();
    console.log('successfully closed the browser');
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();