# Playwright Test Intro

This file make a quick explanation for playwright test.

## What is playwright test

Simply, this test simulates user actions on a server-side webpage.
The content of test include button, text of webpage and so on.
It could even test if url works.

## How is playwright test work in our project?

Our project more forces on testing local server rather than server in aws.
You could run:
```text
npx playwright test --config=tests/playwright.config.ts
```
This instruction will test all units test for playwright in local.
If you change the path of `playwright.config.ts`, you might need to change the path after `--config=` as well.

You could also run:
```text
npx playwright test <path of your test> --config=tests/playwright.config.ts
```
to run your test instead of all.

## Configuration of our playwright test

Our project will use **4 workers** to test **local** while **2 workers** to test in **CI**.

Also, project will be tested in three different browsers:
+ Chromium
+ Firefox
+ Safari

But we only allow it to run chromium in default in order to decrease unnecessary run time of playwright.
If you want to run all the browsers, you could run:
```text
CROSS_BROWSER=1 npx playwright test --config=tests/playwright.config.ts
```
## Next Step
1. divide local server and remote server test
2. change config of playwright test based on independent tests
3. add several tests for remote server
4. improve coverage of playwright test
