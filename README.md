# HymyPassi (HyMy-kylä Feedback App)

A simple, kiosk-friendly customer feedback app created for **HyMy-kylä**.  
The goal of the app is to make it easy for customers to give feedback **immediately after their visit**, without needing an internet connection or technical knowledge.

The app works **fully offline**, stores feedback **locally on the device**, and allows staff to **export the collected feedback as a CSV file** for further use.

---

## Why this project exists

HyMy-kylä receives relatively little feedback in its current form, which makes it difficult to improve services based on real user experiences.  
Customers often do not return later to give feedback, so this project focuses on collecting feedback **on-site, right after the service experience**.

This repository contains the mobile application part of a wider feedback solution, which also includes ideas about:
- where feedback points should be placed,
- how customers are reminded to give feedback,
- and how staff can easily access the results.

---

## Key features

- Simple and fast feedback flow
- Star rating (1–5)
- Optional open text feedback
- Optional service selection
- Fully offline (no internet required)
- Local SQLite database on the device
- CSV export from admin view
- Admin view protected with a PIN code
- Multi-language support:
  - Finnish
  - English
  - Swedish
- Automatic timeout that returns the app to the start screen

---

## Technology used

- React Native (Expo)
- TypeScript
- SQLite (local on-device database)

---

# Using the app (non-technical guide)

This section is meant for staff members or users who do **not** have a technical background.

## Giving feedback (customer use)

1. Open the app on the tablet or phone.
2. Choose your language (Finnish, English, or Swedish).
3. Answer the questions by selecting **1–5 stars**.
4. Tap **Next** to continue.
5. (Optional) Write open feedback in the text field.
6. (Optional) Select the service you used.
7. Submit the feedback.
8. The app will automatically return to the start screen.

**Note:**  
If someone leaves the feedback unfinished, the app will reset after a short timeout so the next user always starts from the beginning.

---

## Admin use: exporting feedback

1. Open the app on the device where feedback has been collected.
2. To open the Admin view:
   - Press and hold the **top-left corner of the screen** for about **2 seconds**, then release.
   - Immediately after, press and hold the **top-right corner of the screen** for about **2 seconds**, then release.
3. Enter the **PIN code**.
4. Choose **Export CSV**.
5. Save or share the file (for example via email, cloud storage, or transfer to a computer).

**Note about the PIN code:**  
The default admin PIN code is **2323**.  
It is recommended to change this before real use.

The PIN code can be changed in the source code:
`App.tsx` → admin PIN validation logic.

### Important information about the data

- All feedback is stored **only on the device**.
- No data is sent to external servers.
- If the device is lost, reset, or deleted, the data will be lost.
- It is recommended to export the CSV file regularly.

---

# Developer setup

## Requirements

- Node.js (LTS version recommended)
- npm
- Expo Go app installed on a mobile device

## Installation and running the project

1. Clone the repository:
   ```bash
   git clone https://github.com/ellenjarvenpaa/HymyPassi.git
   cd HymyPassi
2. Install dependencies:
   ```bash
   npm install
3. Start the project:     
   ```bash
   npx expo start
4. Open the app:
    
    *   Android: Scan the QR code with Expo Go
        
    *   iOS: Scan the QR code with the camera and open in Expo Go
        

Recommended real-world usage (kiosk setup)
------------------------------------------

For best results in HyMy-kylä:

*   Use one dedicated tablet or phone.
    
*   Keep the app open at all times.
    
*   Place the device near the feedback point.
    
*   Export feedback on a regular schedule (daily or weekly).
    
*   Limit access to device settings to prevent accidental exits.
    

Data privacy and security
-------------------------

*   Feedback is stored locally and not transmitted over the internet.
    
*   Admin access is protected with a PIN code.
    
*   The offline design reduces risks related to external data access.
    

Project background
------------------

This app was developed as part of the **HyMy-kylä 3 innovation project** at Metropolia University of Applied Sciences.The project focused on improving the entire feedback process, not just the technical solution.

Future development ideas
------------------------

*   Admin dashboard with visual statistics
    
*   QR code for quick survey access
    
*   Notifications for new feedback submissions
    
*   Improved misuse prevention features
