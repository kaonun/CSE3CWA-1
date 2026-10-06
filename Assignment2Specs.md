Purpose

This assessment is the second stage of a larger project that continues from Assessment 1. In Assessment 1, the focus was on frontend design and usability for a Wordle-style and Word Search builder for Speech Pathology students and teachers. Assessment 2 extends that work by introducing the backend and database layer so that the application can store, manage, and retrieve word lists and activity settings more reliably.



The purpose of this stage is to move from a frontend-only builder to a data-driven application. Teachers should be able to create and manage phoneme-based word lists, save activity settings, and generate downloadable HTML outputs from stored data. This assessment prepares you to apply backend development, database design, API construction, and data persistence in the context of a specialist educational web application.



Task details

Design and implement the backend and database functionality for the Wordle and Word Search builder developed in Assessment 1. The application should allow teachers to enter, save, update, retrieve, and delete phoneme-based word content and related activity settings using a database-driven workflow.



Assessment 2 should support the generation of HTML activity outputs based on stored data rather than only temporary frontend values. The backend should provide the data needed to build Wordle and Word Search activities, including word lists, phoneme symbols, difficulty settings, hints, and any other metadata required by the application.



At this stage, the system should remain focused on Speech Pathology students and teachers. The builder should continue to generate activities for classroom use, but now the teacher’s content should be stored and managed through the backend rather than being hard-coded into the frontend. The completed application should also be able to run inside a Docker container.



Instructions

You are required to:



1. Develop the project from a Next.js app created with npx create-next-app .

   1. The project must be created using the Next.js starter workflow.
   2. The application should then be extended with the required backend, database, and API functionality.
2. Develop a backend application that supports the frontend from Assessment 1.

   1. Build server-side logic to handle activity data.
   2. Ensure the frontend can communicate with the backend through APIs or routes.
   3. Keep the backend aligned with the Wordle and Word Search builder use case.
3. Dockerize the application so that it runs in a Docker container and can be reproduced consistently in different environments. Use a Dockerfile structure similar to the one demonstrated in the relevant lab.
4. Design and implement a database schema that supports the project.

   1. The database must allow the user to add a list of words and the phonemes for each word.
   2. Phonemes may take up more than one character space, so the schema should store them appropriately.
   3. The schema should represent phoneme-based word lists, activity type, difficulty level, hints, generated output settings, and any related metadata.
   4. The schema should support storing and retrieving multiple activity configurations.
   5. Use a suitable database tool or ORM such as Prisma.
5. Provide CRUD functionality for the data model.

   1. Teachers should be able to create new word lists or activity sets.
   2. Teachers should be able to read, update, and delete stored data.
   3. The database should support the management of multiple Wordle or Word Search configurations.
   4. CRUD operations for words in the database must be demonstrated in the video.
6. Support the activity generation workflow.

   1. The backend should provide the data needed to generate downloadable HTML activity files.
   2. The app should support both Wordle and Word Search outputs using stored data.
   3. Word lists should be able to drive the generated content rather than being limited to a single fixed example.
7. Implement validation and error handling.

   1. Validate user input before storing it in the database.
   2. Handle missing, invalid, or malformed phoneme data gracefully.
   3. Provide clear error messages where appropriate.
8. Demonstrate the system in a video walkthrough.

   1. Show your student ID within the first 30 seconds.
   2. Show your face and provide narration throughout the video.
   3. Explain how the backend works and how the database supports the builder.
   4. Demonstrate creating, saving, editing, reading, and deleting words or activity settings.
   5. Show how the frontend uses backend data to generate Wordle and Word Search outputs.
   6. Demonstrate the health API returning 200 OK at /health.
   7. Demonstrate the application running inside a Docker container.
9. Produce a working technical submission.

   1. Submit the project code as a zip file.
   2. Include your GitHub repository link.
   3. Remove node\_modules before uploading.
10. Technical expectations:

    1. Use React, Next.js, and server-side development practices appropriately.
    2. Apply modular and reusable code where possible.
    3. Ensure code readability, maintainability, and reliability.
    4. Demonstrate a backend and database architecture that can support later testing and deployment assessments.



Project continuity

This assessment builds directly on Assessment 1. The frontend builder and user interface should remain in place, but Assessment 2 adds the backend and database layer that make the builder more practical and reusable.



Assessment 1 established the interface for creating Wordle and Word Search activities. Assessment 2 now makes it possible to store phoneme-based word lists, manage activity settings, and generate downloadable HTML outputs from saved data. Later assessments will extend the project further by improving reliability, testing, and any additional deployment or presentation requirements.



Resources and readings relevant to the assessment

The following resources are especially relevant to this assessment:



* Next.js documentation
* React documentation
* Database and ORM documentation
* API and server-side development resources
* Lecture and tutorial materials on backend development, persistence, validation, and data handling
