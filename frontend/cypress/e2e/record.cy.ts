describe('record view', () => {
  it('starts a mocked realtime session, stops it, and saves the transcript', () => {
    cy.intercept('GET', '**/realtime/token', {
      statusCode: 200,
      body: {
        jwt: 'temporary-jwt',
        websocketUrl: 'wss://eu.rt.speechmatics.com/v2?jwt=temporary-jwt',
        expiresInSeconds: 300,
      },
    }).as('getRealtimeToken');

    cy.intercept('POST', '**/realtime/save', (req) => {
      expect(req.body).to.deep.equal({
        transcript: 'Hello from Cypress',
        title: 'Daily sync',
        language: 'en',
      });

      req.reply({
        statusCode: 200,
        body: {
          message: 'Live transcript saved.',
          transcriptionId: '01SAVEID',
          transcriptKey: 'transcripts/cypress-user-id/01SAVEID/daily-sync.txt',
          filename: 'daily-sync.txt',
          status: 'completed',
        },
      });
    }).as('saveRealtimeTranscript');

    cy.visitAuthenticated('/record', {}, {
      onBeforeLoad(win) {
        type RealtimeEvent = {
          data: {
            message: string;
            metadata?: { transcript?: string };
          };
        };
        type E2EWindow = Cypress.AUTWindow & {
          __VOCALI_E2E_REALTIME__?: {
            sampleRate: number;
            createClient: () => {
              addEventListener: (
                eventName: 'receiveMessage',
                listener: (event: RealtimeEvent) => void
              ) => void;
              start: () => Promise<void>;
              stopRecognition: () => Promise<void>;
              sendAudio: () => void;
            };
          };
        };

        let receiveMessageListener: ((event: RealtimeEvent) => void) | undefined;
        const e2eWindow = win as E2EWindow;

        e2eWindow.__VOCALI_E2E_REALTIME__ = {
          sampleRate: 16000,
          createClient: () => ({
            addEventListener: (_eventName: 'receiveMessage', listener: (event: RealtimeEvent) => void) => {
              receiveMessageListener = listener;
            },
            start: async () => {
              receiveMessageListener?.({
                data: {
                  message: 'AddPartialTranscript',
                  metadata: { transcript: 'Hello...' },
                },
              });
              receiveMessageListener?.({
                data: {
                  message: 'AddTranscript',
                  metadata: { transcript: 'Hello from Cypress' },
                },
              });
            },
            stopRecognition: async () => {
              receiveMessageListener?.({
                data: {
                  message: 'EndOfTranscript',
                },
              });
            },
            sendAudio: () => undefined,
          }),
        };
      },
    });

    cy.get('[data-testid="record-page"]').should('be.visible');
    cy.get('[data-testid="record-start-button"]').click();
    cy.wait('@getRealtimeToken');

    cy.get('[data-testid="record-partial-transcript"]').should('contain.text', 'Hello');
    cy.get('[data-testid="record-final-transcripts"]').should('contain.text', 'Hello from Cypress');

    cy.get('[data-testid="record-stop-button"]').click();
    cy.get('[data-testid="record-title-input"]').type('Daily sync');
    cy.get('[data-testid="record-save-button"]').click();

    cy.wait('@saveRealtimeTranscript');
    cy.contains('Saved transcript as daily-sync.txt. View it from history.').should('be.visible');
  });
});
