Pandit API Postman Guide

1) Files Created
- Collection: SAMAGRAN-Pandit-APIs.postman_collection.json
- Environment: SAMAGRAN-Pandit-APIs.local.postman_environment.json

2) Import in Postman
- Open Postman
- Click Import
- Select both files from postman folder
- Choose environment SAMAGRAN Local

3) Run Order (Recommended)
- 1. Signup OTP
- 2. Verify Signup OTP
- 6. Get Profile
- 7. Update Profile (JSON)
- 6. Get Profile (recheck)
- 8. Update Profile (Aadhaar Images Form-Data) for image upload test

4) Login Flow Test
- 3. Login OTP
- 4. Verify Login OTP

5) Important Notes
- Verify requests auto-save panditToken in environment.
- For request 8, choose local files for aadhaarFrontImage and aadhaarBackImage.
- If server URL changes, update baseUrl in environment.

6) Field Coverage From Screens
- Personal info: fullName, phone, address, city, state, pinCode, yearsOfExperience, templeAssociated, languagesSpoken
- Aadhaar: number, front image, back image, consent
- Service type: online/home/temple/travel flags, detectedLocation, serviceDistance, outstationAvailability
- Poojas: name, selected, durationHours, travelForSpecialPooja, standardSamagri, customSamagri
