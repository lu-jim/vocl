describe('history view', () => {
  it('lists entries, starts transcription, views/downloads transcripts, and paginates', () => {
    let rootHistoryLoads = 0;

    cy.intercept('GET', '**/transcriptions*', (req) => {
      if (req.query.cursor === 'page-2') {
        req.reply({
          statusCode: 200,
          body: {
            items: [
              {
                transcriptionId: '01PAGE2',
                filename: 'page-two.mp3',
                status: 'completed',
                audioKey: 'uploads/cypress/page-two.mp3',
                createdAt: '2026-04-19T12:10:00.000Z',
              },
            ],
            nextCursor: null,
          },
        });
        return;
      }

      rootHistoryLoads += 1;

      req.reply({
        statusCode: 200,
        body: {
          items:
            rootHistoryLoads === 1
              ? [
                  {
                    transcriptionId: '01UPLOADED',
                    filename: 'queued-audio.mp3',
                    status: 'uploaded',
                    audioKey: 'uploads/cypress/queued-audio.mp3',
                    createdAt: '2026-04-19T12:00:00.000Z',
                  },
                  {
                    transcriptionId: '01COMPLETED',
                    filename: 'finished-audio.mp3',
                    status: 'completed',
                    audioKey: 'uploads/cypress/finished-audio.mp3',
                    createdAt: '2026-04-19T12:05:00.000Z',
                  },
                ]
              : [
                  {
                    transcriptionId: '01UPLOADED',
                    filename: 'queued-audio.mp3',
                    status: 'completed',
                    audioKey: 'uploads/cypress/queued-audio.mp3',
                    createdAt: '2026-04-19T12:00:00.000Z',
                  },
                  {
                    transcriptionId: '01COMPLETED',
                    filename: 'finished-audio.mp3',
                    status: 'completed',
                    audioKey: 'uploads/cypress/finished-audio.mp3',
                    createdAt: '2026-04-19T12:05:00.000Z',
                  },
                ],
          nextCursor: 'page-2',
        },
      });
    }).as('loadHistory');

    cy.intercept('POST', '**/transcribe', {
      statusCode: 200,
      body: {
        message: 'Transcription started.',
      },
    }).as('startTranscription');

    cy.intercept('GET', '**/download/01COMPLETED?disposition=inline', {
      statusCode: 200,
      body: 'Inline transcript from Cypress',
    }).as('viewTranscript');

    cy.intercept('GET', '**/download/01COMPLETED?disposition=attachment', {
      statusCode: 200,
      body: 'Download transcript from Cypress',
    }).as('downloadTranscript');

    cy.visitAuthenticated('/history');
    cy.wait('@loadHistory');

    cy.get('[data-testid="history-row-01UPLOADED"]').should('contain.text', 'queued-audio.mp3');
    cy.get('[data-testid="history-row-01COMPLETED"]').should('contain.text', 'finished-audio.mp3');

    cy.get('[data-testid="history-view-01COMPLETED"]').click();
    cy.wait('@viewTranscript');
    cy.get('[data-testid="history-transcript-modal"]').should(
      'contain.text',
      'Inline transcript from Cypress'
    );
    cy.get('[data-testid="history-transcript-close"]').click();

    cy.window().then((win) => {
      const createObjectURLStub = cy.stub(win.URL, 'createObjectURL').returns('blob:download-test');
      const revokeObjectURLStub = cy.stub(win.URL, 'revokeObjectURL');

      cy.wrap(createObjectURLStub).as('createObjectURL');
      cy.wrap(revokeObjectURLStub).as('revokeObjectURL');
    });

    cy.get('[data-testid="history-download-01COMPLETED"]').click();
    cy.wait('@downloadTranscript');
    cy.get('@createObjectURL').should('have.been.calledOnce');

    cy.get('[data-testid="history-transcribe-01UPLOADED"]').click();
    cy.wait('@startTranscription');
    cy.wait('@loadHistory');
    cy.get('[data-testid="history-success"]').should(
      'contain.text',
      'Started transcription for queued-audio.mp3.'
    );

    cy.get('[data-testid="history-next-button"]').click();
    cy.wait('@loadHistory');
    cy.get('[data-testid="history-row-01PAGE2"]').should('contain.text', 'page-two.mp3');
  });
});
