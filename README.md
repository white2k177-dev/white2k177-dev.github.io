# MVX STORE — Basic Professional UI

This version is rebuilt from the original 10-file project.
The original HTML and JavaScript logic is preserved. The stylesheet was
reworked from the original CSS structure instead of replacing selectors with
a separate override system.

No extra feature modules or subfolders were added.


## Google Login Fix
Mobile devices use Firebase `signInWithRedirect()` instead of popup. Desktop keeps popup with automatic redirect fallback when the popup is blocked or closed. Redirect results are processed on `login.html`.
