## What is this

Our beloved https://cwg-rpg.github.io/ is down (error 404).
Here is a temporary copy.
The link to the hosted site: https://hmnid.github.io/cwg-wiki/

## How to transfer my local settings from the original wiki

1. Open https://cwg-rpg.github.io/. Yeah, I know, it shows 404 now, anyways
2. Press F12 to open web developer tools
3. Open the "Console" tab
4. Paste the following script and press enter
    ```js
    copy(JSON.stringify(localStorage))
    ```
    It should copy your cwg wiki settings to your clipboard
5. Open https://hmnid.github.io/cwg-wiki/
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
    location.reload();
    ```
9. Fin
