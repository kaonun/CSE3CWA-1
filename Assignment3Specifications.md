Assignment 3 Specifications

Purpose

This assessment is the third stage of the larger project that continues throughout the subject. Assessment 1 focused on frontend design and usability for the Wordle and Word Search builder, and Assessment 2 focused on backend implementation, database integration, CRUD operations, and Docker execution. Assessment 3 now extends the same project into a data-driven web application and reporting stage. The aim is to demonstrate that the Wordle and Word Search builder can store, process, monitor, and present data in a meaningful operational format.

This assessment places a strong emphasis on observability, testing, and reporting. The system should not only work, but also produce evidence that it is functioning correctly, can be monitored, and can be evaluated using practical tests and accessibility checks.

MUST BE CREATED FROM: npx create-next-app .


Task details

Develop a data-driven web application that builds on the frontend and backend work completed in Assessments 1 and 2. The application should support stored phoneme-based word lists, dashboard summaries, simulated input records, alerts, reporting views, and operational monitoring. The project should remain focused on the same Wordle and Word Search builder use case, but now the emphasis is on how the system manages, analyses, monitors, and presents information over time.

The application should include meaningful statistics and operational views so that the status of the system can be monitored during use. This must include a healthcheck endpoint where /health returns 200 OK. It should also include database-backed metrics and dashboard indicators for how many Wordle and Word Search activities have been created, average time on page, most-used activity type, successful generation count, failed generation count, and other meaningful usage statistics. These metrics should help show whether the system is active, healthy, and being used effectively.


Instructions

You are required to:

1. Extend the existing application so that it includes a data-driven dashboard interface.
   1. The dashboard should present useful summaries of the stored word lists and activity configurations.
   2. It should include operational information such as health status, how many Wordle and Word Search activities have been created, average time on page, most-used activity type, successful generation count, failed generation count, or other meaningful usage statistics.
   3. It should be clear, organised, and appropriate for the builder use case.

2. Work with simulated input records and database persistence.
   1. The application should store and retrieve records from the database.
   2. The data should reflect the structure of the Wordle and Word Search builder, such as word lists, phoneme symbols, activity types, difficulty levels, hints, output settings, and related metadata.
   3. The database should also store the statistics used for reporting and observability, such as creation counts, successful generation counts, failed generation counts, average time on page, and activity type usage summaries.
   4. The information should be presented in a way that supports reporting and monitoring.

3. Instrument the application.
   1. Add visible dashboard elements or status indicators that show the behaviour of the application.
   2. Include observability features such as a health check, activity creation summaries, usage counters, total generated outputs, average time on page, most-used activity type, or other server-side monitoring outputs.
   3. Use these features to show that the app can be monitored and understood while it is running.
   4. Show error or warning indicators for failed generation, empty word lists, invalid data, or other unusual states where appropriate.

4. Test the application using both Playwright and JMeter.
   1. Playwright: create end-to-end tests for both the builder and generated output use cases.
   2. One Playwright test must demonstrate a builder use case such as CRUD operations for a word list or activity configuration.
   3. One Playwright test must demonstrate a user use case such as generating or viewing a Wordle or Word Search activity.
   4. JMeter: perform load testing against the builder and generated activity workflow.
   5. Your load testing should include multiple traffic levels, such as x1, x10, x100, x1000 and x10000 users, or equivalent staged load levels.
   6. Use the results to explain how the system behaves under different loads.

5. Evaluate accessibility using Lighthouse.
   1. Run Lighthouse accessibility checks and show the results in the video.
   2. Explain any changes you made after reviewing the Lighthouse report.
   3. Discuss how the accessibility results influenced the final design.

6. Demonstrate the application in a video recording.
   1. The video should be 3 to 8 minutes in length.
   2. It should include your face, voice and student ID.
   3. It should show the working application, dashboard, data-driven features, alerts, reporting views, observability metrics, Playwright tests, JMeter results, Lighthouse accessibility results, GitHub homepage and commits.
   4. It should clearly explain how the system works and how the data flow supports the Wordle and Word Search builder.

7. Produce a working technical submission.
   1. Submit the project code as a zip file.
   2. Include your GitHub repository link.
   3. Remove node\_modules before uploading.

8. Technical expectations:
   1. Use React, Next.js and server-side development practices appropriately.
   2. Apply modular and reusable code where possible.
   3. Ensure code readability, maintainability and reliability.
   4. Demonstrate a data-driven architecture that can support the final live presentation in Assessment 4.


Project continuity

This assessment forms the data and reporting stage of the broader project. Assessment 1 established the frontend design and usability layer. Assessment 2 added the backend, API, database and Docker implementation. Assessment 3 now builds on that foundation by introducing dashboard views, simulated input records, operational statistics, alerts, reporting and testing. Assessment 4 will then present the final integrated system as a live demonstration with questions and answers.


Resources and readings relevant to the assessment

The following modules and labs are especially relevant to this assessment:

Module 8: Testing lecture and lab activities covering robustness, load and accessibility testing

Module 9: Instrumentation and observability

Other relevant resources include:

Next.js documentation

React documentation

Database, ORM and API documentation

Lecture and tutorial materials on dashboard design, reporting interfaces, data interpretation, observability and system feedback


Assessment criteria

The rubric for this assessment will focus on dashboard quality, database persistence, operational statistics, alerts, reporting views, observability, testing, data presentation, technical quality, and the video demonstration. The detailed rubric will be developed after the assessment brief is finalised.


Submission details

Submit:

* A zip file containing your project code and GitHub repository link. Remove node\_modules before uploading.
* A video recording (3 to 8 minutes maximum) showing your student ID, face and voice, and demonstrating the dashboard, data-driven features, alerts, reporting views, observability metrics, Playwright tests, JMeter results, Lighthouse accessibility results, GitHub homepage and commits.

In keeping with La Trobe University policy, all assignments are to be submitted in Moodle via Turnitin.

To be accepted, your assessment submission must generate a similarity score (you are responsible for checking this). Submitting in Word or PDF format is the best way to do this. If your submission does not generate a similarity score, it cannot be checked for plagiarism and therefore will not be marked.
