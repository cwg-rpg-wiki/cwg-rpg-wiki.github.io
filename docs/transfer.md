# How to transfer my local settings from the original wiki

You want to read this when you want to transfer your settings from the original wiki https://cwg-rpg.github.io/ to the copy hosted by this repository https://cwg-rpg-wiki.github.io/

This instruction involves messing with your browser's web developer tools.
This is potentially dangerous to your security. If you are at any point not sure what is going on, then do not proceed.

1. Open https://cwg-rpg.github.io/. Yeah, I know, it shows 404 now, anyways
2. Press F12 to open web developer tools
3. Open the "Console" tab
4. Paste the following script and press enter
    ```js
    copy(JSON.stringify(localStorage))
    ```
    It should copy your cwg wiki settings to your clipboard
5. Open https://cwg-rpg-wiki.github.io/
6. Press F12, open the "Console" tab
7. Paste the following code and press enter
    ```js
    const data = PASTE YOUR SETTINGS HERE
    ```
8. Paste the following code and press enter
    ```js
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    ```
9. Refresh the web page (F5)
10. Fin
