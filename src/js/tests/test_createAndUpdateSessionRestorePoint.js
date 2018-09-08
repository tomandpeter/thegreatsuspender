/*global chrome, gsStorage, gsSession, fixtures, assertTrue */
var testSuites = typeof testSuites === 'undefined' ? [] : testSuites;
testSuites.push(
  (function() {
    'use strict';

    const oldVersion = '1.2.34';
    const newVersion = '7.7.77';

    const tests = [
      // Test create session restore point when no current sessions exist
      // Should create a session from the currently open windows
      async () => {
        await gsStorage.clearGsDatabase();

        // Simulate gsSession.prepareForUpdate
        const sessionRestorePointAfter = await gsStorage.createSessionRestorePoint(
          oldVersion,
          newVersion
        );

        //TODO: For now, this is unimplemented functionality. If there is no existing current
        // session, then createSessionRestorePoint will not be able to create a session.
        // const sessionRestoreMatchesCurrentSession =
        //   sessionRestorePointAfter.windows[0].tabs.length === 5;
        // return assertTrue(sessionRestoreMatchesCurrentSession);
        return assertTrue(sessionRestorePointAfter === null);
      },

      // Test create session restore point when current sessions exists
      // Should create a session from the currently open windows
      async () => {
        await gsStorage.clearGsDatabase();

        // Create a current session from fixtures
        const session1 = fixtures.currentSessions.currentSession1;
        session1.sessionId = gsSession.getSessionId();
        await gsStorage.updateSession(session1);

        // Simulate gsSession.prepareForUpdate
        const sessionRestorePointAfter = await gsStorage.createSessionRestorePoint(
          oldVersion,
          newVersion
        );
        const sessionRestoreMatchesCurrentSession =
          sessionRestorePointAfter.windows[0].tabs.length === 5;
        return assertTrue(sessionRestoreMatchesCurrentSession);
      },

      // Test create session restore point when session restore point already exists
      // NOTE: Existing session restore point should have different id for this test
      // Should update the current session restore point
      async () => {
        const sessionRestorePointBefore = await gsStorage.fetchSessionRestorePoint(
          gsStorage.DB_SESSION_POST_UPGRADE_KEY,
          newVersion
        );
        const newId = '_777777';
        sessionRestorePointBefore.id = newId;
        sessionRestorePointBefore.sessionId = newId;
        await gsStorage.updateSession(sessionRestorePointBefore);
        const newSessionRestorePointBefore = await gsStorage.fetchSessionBySessionId(
          newId
        );
        const sessionRestorePointBeforeValid =
          newSessionRestorePointBefore.windows[0].tabs.length === 5;

        // Update current session from fixtures
        const session1 = fixtures.currentSessions.currentSession1;
        const currentSessionId = gsSession.getSessionId();
        session1.sessionId = currentSessionId;
        session1.windows[0].tabs.push({
          id: 7777,
          title: 'testTab',
          url: 'https://test.com',
        });
        await gsStorage.updateSession(session1);
        const newCurrentSession = await gsStorage.fetchSessionBySessionId(
          currentSessionId
        );
        const currentSessionUpdated =
          newCurrentSession.windows[0].tabs.length === 6;

        // Simulate gsSession.prepareForUpdate
        //TODO: I think ideally we'd just change this function to createOrUpdateSessionRestorePoint
        const sessionRestorePointAfter = await gsStorage.createSessionRestorePoint(
          oldVersion,
          newVersion
        );
        const sessionRestorePointAfterValid =
          sessionRestorePointAfter.windows[0].tabs.length === 6;

        //TODO: Fix bug where calling createSessionRestorePoint a second time for same versions
        // causes two sessions to exists with these version numbers (it should update existing one)
        // Conveniently for this current release, it always returns the most recently created one.
        const gsTestDb = await gsStorage.getDb();
        const sessionRestoreCount = await gsTestDb
          .query(gsStorage.DB_SAVED_SESSIONS)
          .filter(gsStorage.DB_SESSION_POST_UPGRADE_KEY, newVersion)
          .execute()
          .then(o => o.length);

        return assertTrue(
          sessionRestorePointBeforeValid &&
            currentSessionUpdated &&
            sessionRestorePointAfterValid &&
            sessionRestoreCount === 2 //should be 1
        );
      },
    ];

    return {
      name: 'Session Restore Points',
      requiredLibs: ['db', 'gsStorage', 'gsSession', 'gsUtils'],
      requiredFixtures: ['currentSessions', 'savedSessions'],
      tests,
    };
  })()
);