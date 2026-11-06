# How to transfer my local settings from the original wiki

Use these instructions to transfer your saved settings from the original wiki, https://cwg-rpg.github.io/, to this copy: https://cwg-rpg-wiki.github.io/.

Use the same browser and profile you previously used for the original wiki, not a private/incognito window.

**Before you start:**
- These commands copy the original site's browser storage to your clipboard, then import it into the copy. They do not send it to a third party. Trust me bro.
- Importing overwrites settings on the destination site. Careful there.
- Never paste console code you do not understand. If you are unsure what a step does, please stop.

1. Open https://cwg-rpg.github.io/. Even if it shows a 404 error, your browser can still retain the settings saved for that origin.
2. Press F12 to open web developer tools
3. Open the "Console" tab
4. Paste the following script and press enter
    ```js
    copy(JSON.stringify(localStorage))
    ```
    This copies your saved browser storage to the clipboard.
5. Open https://cwg-rpg-wiki.github.io/
6. Press F12, open the "Console" tab
7. Type `const data = ` in the Console, then paste the JSON copied in step 4 and press Enter. The result should look something like this (your keys and values will differ):
    ```js
    const data = {"cwgSetup":"{\"tier\":12}"};
    ```
    Use your copied data, not the example above.
8. Paste the following code and press enter
    ```js
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    ```
9. Refresh the web page (F5)
10. Done. Your transferred settings should now be available.
