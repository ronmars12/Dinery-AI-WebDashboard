import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { firestore, auth } from "../../firebase";
import Campaigns from "./Campaigns";

// ─── i18n Translations ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    // CRM Shell
    crm: 'CRM',
    customerRelationshipManagement: 'Customer Relationship Management',
    noRestaurantFound: 'No restaurant found',
    pleaseAddRestaurant: 'Please add a restaurant first in the Restaurant section.',
    loading: 'Loading CRM…',
    // Nav tabs
    overview: 'Overview',
    emailAutomation: 'Email Automation',
    campaigns: 'Campaigns',
    guestFeedback: 'Guest Feedback',
    // Overview
    analyticsDashboard: 'Analytics Dashboard',
    realTimeInsights: 'Real-time insights into your guest engagement and campaign performance',
    live: 'Live',
    updatedAt: 'Updated {time}',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    emailsSent: 'Emails Sent',
    last30Days: 'Last 30 days',
    surveyResponses: 'Survey Responses',
    responseRate: 'Response Rate',
    avgOverallRating: 'Avg Overall Rating',
    outOf5: 'out of 5 stars',
    offerPerformance: 'Offer Performance',
    trackReturnVisits: 'Track how your return visit offers are performing',
    offersSent: 'Offers Sent',
    linkClicks: 'Link Clicks',
    clickThroughRate: 'click-through rate',
    reservationsBooked: 'Reservations Booked',
    conversionFromClicks: 'conversion from clicks',
    redeemedVisits: 'Redeemed Visits',
    completedVisits: 'completed visits',
    redemptionRate: 'Redemption Rate',
    ofTotalOffersSent: 'of total offers sent',
    campaignRevenue: 'Campaign Revenue',
    estimatedRevenueFromCampaigns: 'Estimated revenue from campaign-driven bookings',
    estimatedRevenueGenerated: 'Estimated Revenue Generated',
    fromCampaignReservations: 'from campaign reservations, after discount',
    bookings: 'bookings',
    redeemed: 'redeemed',
    averageRatings: 'Average Ratings',
    guestSatisfaction: 'Guest satisfaction across all categories',
    overall: 'Overall',
    food: 'Food',
    service: 'Service',
    atmosphere: 'Atmosphere',
    publicReviewFunnel: 'Public Review Funnel',
    guestAdvocacy: 'Guest advocacy and public review prompts',
    positiveSubmissions: 'Positive Submissions',
    ofTotalResponses: 'of total responses',
    googleReviewPrompts: 'Google Review Prompts',
    shownToEligibleGuests: 'shown to eligible guests',
    tripAdvisorPrompts: 'TripAdvisor Prompts',
    recentGuestFeedback: 'Recent Guest Feedback',
    latestSubmissions: 'Latest submissions from your guests',
    new: 'new',
    noFeedbackCollected: 'No feedback collected yet',
    guestResponsesAppear: 'Guest responses will appear here once they submit the survey',
    anonymousGuest: 'Anonymous Guest',
    // Feedback Detail Modal
    feedbackDetail: 'Feedback Detail',
    linkedReservation: 'Linked Reservation',
    visitDate: 'Visit date',
    time: 'Time',
    partySize: 'Party size',
    table: 'Table',
    status: 'Status',
    surveyLink: 'Survey Link',
    copy: 'Copy',
    // Guest Feedback
    responsesCollected: 'Responses collected via your thank you email survey.',
    exportCSV: 'Export CSV',
    totalResponses: 'Total Responses',
    avgFood: 'Avg Food',
    avgService: 'Avg Service',
    avgAtmosphere: 'Avg Atmosphere',
    avgOverall: 'Avg Overall',
    listView: 'List view',
    summary: 'Summary',
    averageByCategory: 'Average by category',
    ratingDistribution: 'Rating distribution',
    positive: 'positive',
    neutral: 'neutral',
    negative: 'negative',
    searchByEmailOrComment: 'Search by email or comment…',
    allRatings: 'All ratings',
    positive4: 'Positive (4+)',
    neutral3: 'Neutral (3–4)',
    negativeBelow3: 'Negative (below 3)',
    newestFirst: 'Newest first',
    oldestFirst: 'Oldest first',
    dateRange: 'Date range:',
    to: 'to',
    clearDates: 'Clear dates',
    shownOf: '{filtered} of {total} shown',
    noFeedbackMatches: 'No feedback matches your current filters.',
    // Email Automation
    configureWorkflow: 'Configure your thank you email workflow and view sent email history.',
    saveSettings: 'Save Settings',
    saving: 'Saving…',
    saved: 'Saved!',
    settings: 'Settings',
    test: 'Test',
    emailLog: 'Email Log',
    automationActive: 'Automation active — sending at {time} the day after each visit',
    automationOff: 'Automation is off',
    offerEnabled: 'offer enabled',
    offerDisabled: 'offer disabled',
    surveyEnabled: 'survey enabled',
    surveyDisabled: 'survey disabled',
    reviewThreshold: 'Review threshold {threshold}★',
    enableBelow: 'Enable below to start sending thank you emails automatically.',
    sendTime: 'Send Time',
    whenEmailSent: 'When the email is sent the day after the reservation.',
    testingTip: 'Testing tip: set this to the current hour then run gcloud scheduler jobs run from your terminal.',
    thankYouMessage: 'Thank You Message',
    openingMessage: 'The opening message guests receive. Click a tag to insert it.',
    returnVisitOffer: 'Return Visit Offer',
    attachExistingOffer: 'Attach one of your existing offers to the thank-you email.',
    loadingOffers: 'Loading your offers…',
    noOffersYet: 'You don\'t have any offers yet. Create one in the Offers tab first.',
    selectOffer: 'Select Offer',
    howOfferLinkWorks: 'How the offer link works',
    offerLinkDescription: 'When a guest clicks "Book Your Next Visit", the click is logged, then they land on the reservation page with the offer code attached. When they complete that booking, it\'s automatically credited back to this campaign — so you can see clicks, bookings, and redemptions all in the Overview tab.',
    campaignRevenueTracking: 'Campaign Revenue Tracking',
    usedToEstimateRevenue: 'Used to estimate revenue generated by guests who book using a campaign offer.',
    averageRevenuePerGuest: 'Average Revenue per Guest',
    averageAmountSpent: 'Average amount one guest typically spends during a visit. No currency symbol — just a number.',
    feedbackSurvey: 'Feedback Survey',
    collectStarRatings: 'Collect star ratings and written comments from guests after their visit.',
    chooseQuestions: 'Choose which questions appear in the survey.',
    foodQuality: 'Food Quality (1–5 stars)',
    serviceLabel: 'Service (1–5 stars)',
    atmosphereLabel: 'Atmosphere (1–5 stars)',
    overallExperience: 'Overall Experience (1–5 stars)',
    additionalComments: 'Additional Comments (free text)',
    enableToCollectFeedback: 'Enable to collect structured feedback from your guests.',
    publicReviewFunnelSettings: 'Public Review Funnel',
    promptSatisfiedGuests: 'Prompt satisfied guests to leave a public review on Google or TripAdvisor.',
    suggestReviewIfAbove: 'Suggest public review if average rating is above',
    andAbove: 'and above',
    only: 'only',
    googleReviewUrl: 'Google Review URL',
    tripAdvisorUrl: 'TripAdvisor Review URL',
    howReviewFunnelWorks: 'How the review funnel works',
    reviewFunnelDescription: 'After a guest submits feedback, the average of all ratings is calculated. If it exceeds the threshold, they are shown Google or TripAdvisor review buttons. If below, a polite thank-you is shown with no review links.',
    // Email Log
    sentEmailLog: 'Sent Email Log',
    reservationsReceivedEmail: 'Reservations that received a thank you email.',
    guest: 'Guest',
    email: 'Email',
    visitDateLabel: 'Visit date',
    sentAt: 'Sent at',
    statusSent: 'Sent',
    showingMostRecent: 'Showing 50 most recent entries',
    noThankYouEmails: 'No thank you emails sent yet',
    emailsAppearAfter: 'Emails appear here after the scheduled function runs',
    // Test Panel
    sendPreviewEmail: 'Send a preview email',
    sendRealEmail: 'Sends a real email using your current settings so you can see exactly what guests receive. Uses your existing sendEmail Cloud Function.',
    sendPreview: 'Send Preview',
    whatThisSends: 'What this sends',
    yourThankYouMessage: 'Your thank you message with placeholder guest/reservation data',
    returnVisitOfferLabel: 'Return visit offer',
    feedbackSurveyLabel: 'Feedback survey button — links to /feedback/PREVIEW (shows not-found since it is a preview, not a real reservation)',
    testWarningBanner: 'Orange warning banner at top marking it as a test',
    previewNote: 'Note: the preview\'s offer button links directly to the reservation page (not through click tracking), so sending a test won\'t affect your Offer Performance stats.',
    preFlightChecklist: 'Pre-flight checklist',
    checksEveryCondition: 'Checks every condition the scheduled function verifies before sending. Run this to diagnose why emails aren\'t going out.',
    reRun: 'Re-run',
    checking: 'Checking…',
    runningChecks: 'Running checks against Firestore…',
    checkedAt: 'Checked at {time}',
    passed: 'passed',
    // Checklist items
    emailAutomationEnabled: 'Email automation enabled',
    enabledInSettings: 'Enabled in settings',
    turnOnFirst: 'Turn on in the Settings panel first',
    sendHourMatches: 'Send hour matches current hour',
    bothSetTo: 'Both set to {hour} ✓',
    configuredVsCurrent: 'Configured: {config}:00 — Current server hour: {current}:00. Go to Settings and change Send Time to "{suggest}" then save, then re-run this checklist.',
    crmSettingsSaved: 'crm_settings saved to Firestore',
    settingsDocFound: 'Settings doc found (you loaded them successfully)',
    yesterdayReservationsFound: 'Yesterday\'s reservations found',
    foundReservation: 'Found: {name}',
    noReservationsYesterday: 'No reservations found for yesterday. Create a test reservation with yesterday\'s date.',
    reservationHasEmail: 'Reservation has customer email',
    hasEmail: 'has email',
    noEmail: 'No email on the sample reservation — add one in Firestore.',
    statusConfirmedOrCompleted: 'Status is confirmed or completed',
    statusIs: 'Status: {status}',
    changeToConfirmed: 'Status is "{status}" — change it to confirmed or completed.',
    emailNotAlreadySent: 'Email not already sent',
    notYetSent: 'Not yet sent for this reservation',
    alreadySent: 'thankYouEmailSent is already true — delete that field in Firestore to re-test.',
    firestoreIndexExists: 'Firestore index for email log',
    indexExists: 'Composite index exists',
    indexMissing: 'Index missing. A creation link was logged to your browser console (F12 → Console tab). Click it and wait ~1 minute, then re-run.',
    createIndexInFirebase: 'Create index in Firebase Console',
    openFirestoreIndexes: 'Open Firestore Indexes',
    // Manual trigger
    manuallyTrigger: 'Manually trigger the scheduled function',
    forcesFunction: 'Forces the function to run now without waiting for the next hourly tick.',
    step1FindJob: '# Step 1 — find the scheduler job name',
    step2Trigger: '# Step 2 — trigger it immediately',
    step3WatchLogs: '# Step 3 — watch the logs live',
    hourMustMatch: 'Hour must match',
    currentHour: 'Current hour: {hour}. Set Send Time in Settings to this exact hour, save, then trigger.',
    dateMustBeYesterday: 'Date must be yesterday',
    functionLooksForYesterday: 'The function looks for reservations where reservation_date is yesterday. Create a test reservation dated yesterday.',
    checkLogsForErrors: 'Check logs for errors',
    lookForErrors: 'Look for ✅ or ❌ lines in the Cloud Functions log. Simulated sends appear when RESEND_API_KEY is not bound.',
    // Feedback Detail
    comments: 'Comments',
    // Placeholders
    yourEmail: 'your@email.com',
  },
  fi: {
    crm: 'CRM',
    customerRelationshipManagement: 'Asiakkuudenhallinta',
    noRestaurantFound: 'Ravintolaa ei löytynyt',
    pleaseAddRestaurant: 'Lisää ravintola ensin Ravintola-osiossa.',
    loading: 'Ladataan CRM…',
    overview: 'Yleiskatsaus',
    emailAutomation: 'Sähköpostiautomaatio',
    campaigns: 'Kampanjat',
    guestFeedback: 'Asiakaspalaute',
    analyticsDashboard: 'Analytiikkapaneeli',
    realTimeInsights: 'Reaaliaikaiset näkemykset asiakkaiden sitoutumisesta ja kampanjoiden suorituskyvystä',
    live: 'Live',
    updatedAt: 'Päivitetty {time}',
    refresh: 'Päivitä',
    refreshing: 'Päivitetään…',
    emailsSent: 'Lähetetyt sähköpostit',
    last30Days: 'Viimeiset 30 päivää',
    surveyResponses: 'Kyselyvastaukset',
    responseRate: 'Vastausprosentti',
    avgOverallRating: 'Keskimääräinen kokonaisarvosana',
    outOf5: '5 tähdestä',
    offerPerformance: 'Tarjousten suorituskyky',
    trackReturnVisits: 'Seuraa, miten paluuvierailutarjouksesi menestyvät',
    offersSent: 'Tarjoukset lähetetty',
    linkClicks: 'Linkin klikkaukset',
    clickThroughRate: 'klikkausprosentti',
    reservationsBooked: 'Varaukset tehty',
    conversionFromClicks: 'muuntuma klikkauksista',
    redeemedVisits: 'Lunastetut käynnit',
    completedVisits: 'toteutuneet käynnit',
    redemptionRate: 'Lunastusprosentti',
    ofTotalOffersSent: 'lähetetyistä tarjouksista',
    campaignRevenue: 'Kampanjatulot',
    estimatedRevenueFromCampaigns: 'Arvioitu tulo kampanjoiden varauksista',
    estimatedRevenueGenerated: 'Arvioitu tuotto',
    fromCampaignReservations: 'kampanjavarauksista, alennuksen jälkeen',
    bookings: 'varausta',
    redeemed: 'lunastettua',
    averageRatings: 'Keskimääräiset arvosanat',
    guestSatisfaction: 'Asiakastyytyväisyys kaikilla osa-alueilla',
    overall: 'Kokonaisuus',
    food: 'Ruoka',
    service: 'Palvelu',
    atmosphere: 'Tunnelma',
    publicReviewFunnel: 'Julkisten arvostelujen suppilo',
    guestAdvocacy: 'Asiakkaiden suositteluhalukkuus ja julkiset arvostelut',
    positiveSubmissions: 'Myönteiset palautteet',
    ofTotalResponses: 'kaikista vastauksista',
    googleReviewPrompts: 'Google-arvostelukutsut',
    shownToEligibleGuests: 'näytetty oikeutetuille asiakkaille',
    tripAdvisorPrompts: 'TripAdvisor-kutsut',
    recentGuestFeedback: 'Viimeisin asiakaspalaute',
    latestSubmissions: 'Viimeisimmät asiakaspalautteet',
    new: 'uutta',
    noFeedbackCollected: 'Palautetta ei ole vielä kerätty',
    guestResponsesAppear: 'Asiakkaiden vastaukset näkyvät täällä, kun he lähettävät kyselyn',
    anonymousGuest: 'Nimetön vieras',
    feedbackDetail: 'Palautteen tiedot',
    linkedReservation: 'Liitetty varaus',
    visitDate: 'Käyntipäivä',
    time: 'Aika',
    partySize: 'Seurueen koko',
    table: 'Pöytä',
    status: 'Tila',
    surveyLink: 'Kyselylinkki',
    copy: 'Kopioi',
    responsesCollected: 'Kyselyvastaukset, jotka on kerätty kiitossähköpostin kautta.',
    exportCSV: 'Vie CSV',
    totalResponses: 'Vastauksia yhteensä',
    avgFood: 'Keskim. ruoka',
    avgService: 'Keskim. palvelu',
    avgAtmosphere: 'Keskim. tunnelma',
    avgOverall: 'Keskim. kokonaisuus',
    listView: 'Listanäkymä',
    summary: 'Yhteenveto',
    averageByCategory: 'Keskiarvo osa-alueittain',
    ratingDistribution: 'Arvosanojen jakautuma',
    positive: 'myönteinen',
    neutral: 'neutraali',
    negative: 'kielteinen',
    searchByEmailOrComment: 'Hae sähköpostilla tai kommentilla…',
    allRatings: 'Kaikki arvosanat',
    positive4: 'Myönteinen (4+)',
    neutral3: 'Neutraali (3–4)',
    negativeBelow3: 'Kielteinen (alle 3)',
    newestFirst: 'Uusimmat ensin',
    oldestFirst: 'Vanhimmat ensin',
    dateRange: 'Aikaväli:',
    to: '–',
    clearDates: 'Tyhjennä päivät',
    shownOf: '{filtered} / {total} näytetään',
    noFeedbackMatches: 'Yksikään palaute ei vastaa suodattimia.',
    configureWorkflow: 'Määritä kiitossähköpostin työnkulku ja tarkastele lähetettyjä sähköposteja.',
    saveSettings: 'Tallenna asetukset',
    saving: 'Tallennetaan…',
    saved: 'Tallennettu!',
    settings: 'Asetukset',
    test: 'Testi',
    emailLog: 'Sähköpostiloki',
    automationActive: 'Automaatio aktiivinen — lähettää klo {time} käynnin jälkeisenä päivänä',
    automationOff: 'Automaatio pois päältä',
    offerEnabled: 'tarjous käytössä',
    offerDisabled: 'tarjous pois käytöstä',
    surveyEnabled: 'kysely käytössä',
    surveyDisabled: 'kysely pois käytöstä',
    reviewThreshold: 'Arvostelukynnys {threshold}★',
    enableBelow: 'Ota käyttöön alapuolella aloittaaksesi kiitossähköpostien automaattisen lähetyksen.',
    sendTime: 'Lähetysaika',
    whenEmailSent: 'Milloin sähköposti lähetetään varauksen jälkeisenä päivänä.',
    testingTip: 'Testivinkki: aseta tämä nykyiseksi tunniksi ja suorita gcloud scheduler jobs run terminaalista.',
    thankYouMessage: 'Kiitosviesti',
    openingMessage: 'Asiakkaiden saama avausviesti. Napsauta tunnistetta lisätäksesi sen.',
    returnVisitOffer: 'Paluuvierailutarjous',
    attachExistingOffer: 'Liitä olemassa oleva tarjous kiitossähköpostiin.',
    loadingOffers: 'Ladataan tarjouksia…',
    noOffersYet: 'Sinulla ei ole vielä tarjouksia. Luo ensin tarjous Tarjoukset-välilehdellä.',
    selectOffer: 'Valitse tarjous',
    howOfferLinkWorks: 'Miten tarjouslinkki toimii',
    offerLinkDescription: 'Kun asiakas napsauttaa "Varaa seuraava käynti", klikkaus kirjataan ja hän siirtyy varaussivulle tarjouskoodin kanssa. Kun hän tekee varauksen, se kirjataan automaattisesti tähän kampanjaan — joten voit nähdä klikkaukset, varaukset ja lunastukset Yleiskatsaus-välilehdellä.',
    campaignRevenueTracking: 'Kampanjatulojen seuranta',
    usedToEstimateRevenue: 'Käytetään arvioimaan tuloja, jotka syntyvät kampanjatarjouksella varaavilta asiakkailta.',
    averageRevenuePerGuest: 'Keskimääräinen tuotto per vieras',
    averageAmountSpent: 'Keskimääräinen summa, jonka yksi vieras tyypillisesti käyttää käynnin aikana. Ei valuuttasymbolia — pelkkä numero.',
    feedbackSurvey: 'Palautekysely',
    collectStarRatings: 'Kerää tähtiarvioita ja kirjallisia kommentteja asiakkailta käynnin jälkeen.',
    chooseQuestions: 'Valitse, mitkä kysymykset näkyvät kyselyssä.',
    foodQuality: 'Ruuan laatu (1–5 tähteä)',
    serviceLabel: 'Palvelu (1–5 tähteä)',
    atmosphereLabel: 'Tunnelma (1–5 tähteä)',
    overallExperience: 'Kokonaiskokemus (1–5 tähteä)',
    additionalComments: 'Lisäkommentit (vapaateksti)',
    enableToCollectFeedback: 'Ota käyttöön kerätäksesi rakenteellista palautetta asiakkailta.',
    publicReviewFunnelSettings: 'Julkisten arvostelujen suppilo',
    promptSatisfiedGuests: 'Pyydä tyytyväisiä asiakkaita jättämään julkinen arvostelu Googleen tai TripAdvisorille.',
    suggestReviewIfAbove: 'Ehdota julkista arvostelua, jos keskiarvo on yli',
    andAbove: 'ja yli',
    only: 'vain',
    googleReviewUrl: 'Google-arvostelun URL',
    tripAdvisorUrl: 'TripAdvisor-arvostelun URL',
    howReviewFunnelWorks: 'Miten arvostelusuppilo toimii',
    reviewFunnelDescription: 'Kun asiakas lähettää palautteen, lasketaan kaikkien arvosanojen keskiarvo. Jos se ylittää kynnyksen, hänelle näytetään Google- tai TripAdvisor-arvostelupainikkeet. Jos alle, näytetään kohtelias kiitos ilman arvostelulinkkejä.',
    sentEmailLog: 'Lähetetyt sähköpostit',
    reservationsReceivedEmail: 'Varaukset, jotka saivat kiitossähköpostin.',
    guest: 'Vieras',
    email: 'Sähköposti',
    visitDateLabel: 'Käyntipäivä',
    sentAt: 'Lähetetty',
    statusSent: 'Lähetetty',
    showingMostRecent: 'Näytetään 50 viimeisintä tapahtumaa',
    noThankYouEmails: 'Kiitossähköposteja ei ole vielä lähetetty',
    emailsAppearAfter: 'Sähköpostit näkyvät täällä ajoitetun funktion suorituksen jälkeen',
    sendPreviewEmail: 'Lähetä testisähköposti',
    sendRealEmail: 'Lähettää oikean sähköpostin nykyisillä asetuksillasi, jotta näet tarkalleen mitä asiakkaat saavat. Käyttää olemassa olevaa sendEmail Cloud Function -toimintoa.',
    sendPreview: 'Lähetä testi',
    whatThisSends: 'Mitä tämä lähettää',
    yourThankYouMessage: 'Kiitosviestisi paikkamerkkivieraalla/varauksella',
    returnVisitOfferLabel: 'Paluuvierailutarjous',
    feedbackSurveyLabel: 'Palautekyselypainike — linkittää osoitteeseen /feedback/PREVIEW (näyttää ei-löytynyt, koska se on testi, ei oikea varaus)',
    testWarningBanner: 'Oranssi varoitusbanneri ylhäällä, joka merkitsee sen testiksi',
    previewNote: 'Huom: testin tarjouspainike linkittää suoraan varaussivulle (ei klikkausseurannan kautta), joten testin lähettäminen ei vaikuta Tarjousten suorituskyky -tilastoihin.',
    preFlightChecklist: 'Esitarkistuslista',
    checksEveryCondition: 'Tarkistaa kaikki ehdot, jotka ajoitettu funktio varmistaa ennen lähetystä. Suorita tämä diagnosoidaksesi, miksi sähköpostit eivät mene perille.',
    reRun: 'Suorita uudelleen',
    checking: 'Tarkistetaan…',
    runningChecks: 'Suoritetaan tarkistuksia Firestorea vastaan…',
    checkedAt: 'Tarkistettu {time}',
    passed: 'hyväksytty',
    emailAutomationEnabled: 'Sähköpostiautomaatio käytössä',
    enabledInSettings: 'Käytössä asetuksissa',
    turnOnFirst: 'Ota käyttöön Asetukset-paneelissa ensin',
    sendHourMatches: 'Lähetystunti vastaa nykyistä tuntia',
    bothSetTo: 'Molemmat asetettu {hour} ✓',
    configuredVsCurrent: 'Asetettu: {config}:00 — Nykyinen palvelintunti: {current}:00. Siirry Asetuksiin ja muuta Lähetysaika muotoon "{suggest}", tallenna ja suorita tämä tarkistuslista uudelleen.',
    crmSettingsSaved: 'crm_settings tallennettu Firestoreen',
    settingsDocFound: 'Asetusdokumentti löytyi (ladattu onnistuneesti)',
    yesterdayReservationsFound: 'Eilisen varaukset löytyivät',
    foundReservation: 'Löytyi: {name}',
    noReservationsYesterday: 'Eiliselle ei löytynyt varauksia. Luo testivaraus eilisen päivämäärällä.',
    reservationHasEmail: 'Varauksella on asiakkaan sähköposti',
    hasEmail: 'on sähköposti',
    noEmail: 'Ei sähköpostia esimerkkivarauksella — lisää sellainen Firestoreen.',
    statusConfirmedOrCompleted: 'Tila on vahvistettu tai valmis',
    statusIs: 'Tila: {status}',
    changeToConfirmed: 'Tila on "{status}" — muuta se vahvistetuksi tai valmiiksi.',
    emailNotAlreadySent: 'Sähköpostia ei ole vielä lähetetty',
    notYetSent: 'Ei vielä lähetetty tälle varaukselle',
    alreadySent: 'thankYouEmailSent on jo tosi — poista tämä kenttä Firestoresta testataksesi uudelleen.',
    firestoreIndexExists: 'Firestore-indeksi sähköpostilokille',
    indexExists: 'Yhdistelmäindeksi on olemassa',
    indexMissing: 'Indeksi puuttuu. Luontilinkki on kirjattu selaimen konsoliin (F12 → Console-välilehti). Napsauta sitä ja odota noin minuutti, suorita sitten uudelleen.',
    createIndexInFirebase: 'Luo indeksi Firebase-konsolissa',
    openFirestoreIndexes: 'Avaa Firestore-indeksit',
    manuallyTrigger: 'Käynnistä ajoitettu funktio manuaalisesti',
    forcesFunction: 'Pakottaa funktion suoritettavaksi nyt odottamatta seuraavaa tuntipyöräytystä.',
    step1FindJob: '# Vaihe 1 — etsi ajoitustyön nimi',
    step2Trigger: '# Vaihe 2 — käynnistä se välittömästi',
    step3WatchLogs: '# Vaihe 3 — seuraa lokit live-tilassa',
    hourMustMatch: 'Tunnin on vastattava',
    currentHour: 'Nykyinen tunti: {hour}. Aseta Lähetysaika Asetuksissa tähän tarkkaan tuntiin, tallenna ja käynnistä.',
    dateMustBeYesterday: 'Päivämäärän on oltava eilinen',
    functionLooksForYesterday: 'Funktio etsii varauksia, joiden reservation_date on eilinen. Luo testivaraus eilisen päivämäärällä.',
    checkLogsForErrors: 'Tarkista lokit virheiden varalta',
    lookForErrors: 'Etsi ✅ tai ❌ -merkkejä Cloud Functions -lokista. Simuloidut lähetykset näkyvät, kun RESEND_API_KEY ei ole sidottu.',
    comments: 'Kommentit',
    yourEmail: 'sinun@sposti.fi',
  },
  no: {
    crm: 'CRM',
    customerRelationshipManagement: 'Kundehåndtering',
    noRestaurantFound: 'Ingen restaurant funnet',
    pleaseAddRestaurant: 'Legg til en restaurant først i Restaurant-delen.',
    loading: 'Laster CRM…',
    overview: 'Oversikt',
    emailAutomation: 'E-postautomatisering',
    campaigns: 'Kampanjer',
    guestFeedback: 'Gjestetilbakemelding',
    analyticsDashboard: 'Analysedashboard',
    realTimeInsights: 'Sanntidsinnsikt i gjesteengasjement og kampanjeresultater',
    live: 'Live',
    updatedAt: 'Oppdatert {time}',
    refresh: 'Oppdater',
    refreshing: 'Oppdaterer…',
    emailsSent: 'E-poster sendt',
    last30Days: 'Siste 30 dager',
    surveyResponses: 'Undersøkelsessvar',
    responseRate: 'Svarprosent',
    avgOverallRating: 'Gjennomsnittlig totalvurdering',
    outOf5: 'av 5 stjerner',
    offerPerformance: 'Tilbudsytelse',
    trackReturnVisits: 'Spor hvordan tilbudene for gjenbesøk presterer',
    offersSent: 'Tilbud sendt',
    linkClicks: 'Lenkeklikk',
    clickThroughRate: 'klikkfrekvens',
    reservationsBooked: 'Reservasjoner boket',
    conversionFromClicks: 'konvertering fra klikk',
    redeemedVisits: 'Innløste besøk',
    completedVisits: 'fullførte besøk',
    redemptionRate: 'Innløsningsrate',
    ofTotalOffersSent: 'av totale tilbud sendt',
    campaignRevenue: 'Kampanjeinntekter',
    estimatedRevenueFromCampaigns: 'Estimert inntekt fra kampanjedrevne bookinger',
    estimatedRevenueGenerated: 'Estimert inntekt generert',
    fromCampaignReservations: 'fra kampanjereservasjoner, etter rabatt',
    bookings: 'bookinger',
    redeemed: 'innløst',
    averageRatings: 'Gjennomsnittlige vurderinger',
    guestSatisfaction: 'Gjestetilfredshet på tvers av alle kategorier',
    overall: 'Totalt',
    food: 'Mat',
    service: 'Service',
    atmosphere: 'Atmosfære',
    publicReviewFunnel: 'Offentlig anmeldelsestrakt',
    guestAdvocacy: 'Gjesteengasjement og offentlige anmeldelser',
    positiveSubmissions: 'Positive tilbakemeldinger',
    ofTotalResponses: 'av totale svar',
    googleReviewPrompts: 'Google-anmeldelsesoppfordringer',
    shownToEligibleGuests: 'vist til kvalifiserte gjester',
    tripAdvisorPrompts: 'TripAdvisor-oppfordringer',
    recentGuestFeedback: 'Siste gjestetilbakemeldinger',
    latestSubmissions: 'Siste innsendte tilbakemeldinger',
    new: 'nye',
    noFeedbackCollected: 'Ingen tilbakemeldinger samlet ennå',
    guestResponsesAppear: 'Gjestesvar vises her når de sender inn undersøkelsen',
    anonymousGuest: 'Anonym gjest',
    feedbackDetail: 'Tilbakemeldingsdetaljer',
    linkedReservation: 'Knyttet reservasjon',
    visitDate: 'Besøksdato',
    time: 'Tid',
    partySize: 'Selskapsstørrelse',
    table: 'Bord',
    status: 'Status',
    surveyLink: 'Undersøkelseslenke',
    copy: 'Kopier',
    responsesCollected: 'Svar samlet inn via takke-e-posten din.',
    exportCSV: 'Eksporter CSV',
    totalResponses: 'Totale svar',
    avgFood: 'Gj.sn. mat',
    avgService: 'Gj.sn. service',
    avgAtmosphere: 'Gj.sn. atmosfære',
    avgOverall: 'Gj.sn. totalt',
    listView: 'Listevisning',
    summary: 'Sammendrag',
    averageByCategory: 'Gjennomsnitt per kategori',
    ratingDistribution: 'Vurderingsfordeling',
    positive: 'positiv',
    neutral: 'nøytral',
    negative: 'negativ',
    searchByEmailOrComment: 'Søk etter e-post eller kommentar…',
    allRatings: 'Alle vurderinger',
    positive4: 'Positiv (4+)',
    neutral3: 'Nøytral (3–4)',
    negativeBelow3: 'Negativ (under 3)',
    newestFirst: 'Nyeste først',
    oldestFirst: 'Eldste først',
    dateRange: 'Datointervall:',
    to: 'til',
    clearDates: 'Tøm datoer',
    shownOf: '{filtered} av {total} vist',
    noFeedbackMatches: 'Ingen tilbakemeldinger samsvarer med filtrene dine.',
    configureWorkflow: 'Konfigurer takke-e-post-arbeidsflyten og se sendte e-poster.',
    saveSettings: 'Lagre innstillinger',
    saving: 'Lagrer…',
    saved: 'Lagret!',
    settings: 'Innstillinger',
    test: 'Test',
    emailLog: 'E-postlogg',
    automationActive: 'Automatisering aktiv — sender kl {time} dagen etter hvert besøk',
    automationOff: 'Automatisering er av',
    offerEnabled: 'tilbud aktivert',
    offerDisabled: 'tilbud deaktivert',
    surveyEnabled: 'undersøkelse aktivert',
    surveyDisabled: 'undersøkelse deaktivert',
    reviewThreshold: 'Anmeldelsesgrense {threshold}★',
    enableBelow: 'Aktiver nedenfor for å begynne å sende takke-e-poster automatisk.',
    sendTime: 'Sendetid',
    whenEmailSent: 'Når e-posten sendes dagen etter reservasjonen.',
    testingTip: 'Testtips: sett denne til gjeldende time, kjør deretter gcloud scheduler jobs run fra terminalen.',
    thankYouMessage: 'Takke-melding',
    openingMessage: 'Åpningsmeldingen gjestene mottar. Klikk på en tag for å sette den inn.',
    returnVisitOffer: 'Tilbud for gjenbesøk',
    attachExistingOffer: 'Fest et av dine eksisterende tilbud til takke-e-posten.',
    loadingOffers: 'Laster tilbudene dine…',
    noOffersYet: 'Du har ingen tilbud ennå. Opprett et i Tilbud-fanen først.',
    selectOffer: 'Velg tilbud',
    howOfferLinkWorks: 'Hvordan tilbudslenken fungerer',
    offerLinkDescription: 'Når en gjest klikker "Book ditt neste besøk", logges klikket, og de lander på reservasjonssiden med tilbudskoden. Når de fullfører bestillingen, blir det automatisk kreditert tilbake til denne kampanjen — slik at du kan se klikk, bookinger og innløsninger i Oversikt-fanen.',
    campaignRevenueTracking: 'Kampanjeinntektssporing',
    usedToEstimateRevenue: 'Brukes til å estimere inntekt generert av gjester som bestiller ved hjelp av et kampanjetilbud.',
    averageRevenuePerGuest: 'Gjennomsnittlig inntekt per gjest',
    averageAmountSpent: 'Gjennomsnittlig beløp en gjest vanligvis bruker under et besøk. Ingen valutasymbol — bare et tall.',
    feedbackSurvey: 'Tilbakemeldingsundersøkelse',
    collectStarRatings: 'Samle stjernevurderinger og skriftlige kommentarer fra gjester etter besøket.',
    chooseQuestions: 'Velg hvilke spørsmål som vises i undersøkelsen.',
    foodQuality: 'Matkvalitet (1–5 stjerner)',
    serviceLabel: 'Service (1–5 stjerner)',
    atmosphereLabel: 'Atmosfære (1–5 stjerner)',
    overallExperience: 'Totalopplevelse (1–5 stjerner)',
    additionalComments: 'Flere kommentarer (fri tekst)',
    enableToCollectFeedback: 'Aktiver for å samle strukturert tilbakemelding fra gjestene.',
    publicReviewFunnelSettings: 'Offentlig anmeldelsestrakt',
    promptSatisfiedGuests: 'Oppfordre fornøyde gjester til å legge igjen en offentlig anmeldelse på Google eller TripAdvisor.',
    suggestReviewIfAbove: 'Foreslå offentlig anmeldelse hvis gjennomsnittsvurderingen er over',
    andAbove: 'og over',
    only: 'kun',
    googleReviewUrl: 'Google-anmeldelse URL',
    tripAdvisorUrl: 'TripAdvisor-anmeldelse URL',
    howReviewFunnelWorks: 'Hvordan anmeldelsestrakt fungerer',
    reviewFunnelDescription: 'Etter at en gjest sender inn tilbakemelding, beregnes gjennomsnittet av alle vurderinger. Hvis det overstiger terskelen, vises Google- eller TripAdvisor-anmeldelsesknapper. Hvis under, vises en høflig takk uten anmeldelseslenker.',
    sentEmailLog: 'Sendt e-postlogg',
    reservationsReceivedEmail: 'Reservasjoner som mottok en takke-e-post.',
    guest: 'Gjest',
    email: 'E-post',
    visitDateLabel: 'Besøksdato',
    sentAt: 'Sendt',
    statusSent: 'Sendt',
    showingMostRecent: 'Viser 50 siste oppføringer',
    noThankYouEmails: 'Ingen takke-e-poster sendt ennå',
    emailsAppearAfter: 'E-poster vises her etter at den planlagte funksjonen kjører',
    sendPreviewEmail: 'Send en forhåndsvisning-e-post',
    sendRealEmail: 'Sender en ekte e-post med dine nåværende innstillinger slik at du kan se nøyaktig hva gjester mottar. Bruker din eksisterende sendEmail Cloud Function.',
    sendPreview: 'Send forhåndsvisning',
    whatThisSends: 'Hva dette sender',
    yourThankYouMessage: 'Takke-meldingen din med plassholder-gjest/reservasjon',
    returnVisitOfferLabel: 'Tilbud for gjenbesøk',
    feedbackSurveyLabel: 'Tilbakemeldingsundersøkelse-knapp — lenker til /feedback/PREVIEW (viser ikke funnet siden det er en forhåndsvisning, ikke en ekte reservasjon)',
    testWarningBanner: 'Oransje varslingsbanner øverst som markerer det som en test',
    previewNote: 'Merk: forhåndsvisningens tilbudsknapp lenker direkte til reservasjonssiden (ikke gjennom klikksporing), så å sende en test påvirker ikke Tilbudsytelse-statistikken din.',
    preFlightChecklist: 'Før-fly-sjekkliste',
    checksEveryCondition: 'Sjekker alle betingelser den planlagte funksjonen verifiserer før sending. Kjør dette for å diagnostisere hvorfor e-poster ikke blir sendt.',
    reRun: 'Kjør på nytt',
    checking: 'Sjekker…',
    runningChecks: 'Kjører sjekker mot Firestore…',
    checkedAt: 'Sjekket {time}',
    passed: 'bestått',
    emailAutomationEnabled: 'E-postautomatisering aktivert',
    enabledInSettings: 'Aktivert i innstillinger',
    turnOnFirst: 'Slå på i Innstillinger-panelet først',
    sendHourMatches: 'Sendetime samsvarer med gjeldende time',
    bothSetTo: 'Begge satt til {hour} ✓',
    configuredVsCurrent: 'Konfigurert: {config}:00 — Gjeldende servertime: {current}:00. Gå til Innstillinger og endre Sendetid til "{suggest}", lagre, og kjør denne sjekklisten på nytt.',
    crmSettingsSaved: 'crm_settings lagret til Firestore',
    settingsDocFound: 'Innstillingsdokument funnet (du lastet dem inn)',
    yesterdayReservationsFound: 'Gårsdagens reservasjoner funnet',
    foundReservation: 'Fant: {name}',
    noReservationsYesterday: 'Ingen reservasjoner funnet for i går. Opprett en testreservasjon med gårsdagens dato.',
    reservationHasEmail: 'Reservasjonen har kundens e-post',
    hasEmail: 'har e-post',
    noEmail: 'Ingen e-post på eksempelreservasjonen — legg til en i Firestore.',
    statusConfirmedOrCompleted: 'Status er bekreftet eller fullført',
    statusIs: 'Status: {status}',
    changeToConfirmed: 'Status er "{status}" — endre den til bekreftet eller fullført.',
    emailNotAlreadySent: 'E-post ikke allerede sendt',
    notYetSent: 'Ikke sendt ennå for denne reservasjonen',
    alreadySent: 'thankYouEmailSent er allerede true — slett dette feltet i Firestore for å teste på nytt.',
    firestoreIndexExists: 'Firestore-indeks for e-postlogg',
    indexExists: 'Sammensatt indeks eksisterer',
    indexMissing: 'Indeks mangler. En opprettelseslenke ble logget til nettleserens konsoll (F12 → Console-faneblad). Klikk på den og vent i ~1 minutt, kjør deretter på nytt.',
    createIndexInFirebase: 'Opprett indeks i Firebase Console',
    openFirestoreIndexes: 'Åpne Firestore-indekser',
    manuallyTrigger: 'Utløs den planlagte funksjonen manuelt',
    forcesFunction: 'Tvinger funksjonen til å kjøre nå uten å vente på neste timetikk.',
    step1FindJob: '# Trinn 1 — finn planleggingsjobbenavnet',
    step2Trigger: '# Trinn 2 — utløs det umiddelbart',
    step3WatchLogs: '# Trinn 3 — se loggene live',
    hourMustMatch: 'Time må samsvare',
    currentHour: 'Gjeldende time: {hour}. Sett Sendetid i Innstillinger til denne nøyaktige timen, lagre, og utløs.',
    dateMustBeYesterday: 'Dato må være i går',
    functionLooksForYesterday: 'Funksjonen ser etter reservasjoner der reservation_date er i går. Opprett en testreservasjon datert i går.',
    checkLogsForErrors: 'Sjekk logger for feil',
    lookForErrors: 'Se etter ✅ eller ❌-linjer i Cloud Functions-logen. Simulerte sendinger vises når RESEND_API_KEY ikke er bundet.',
    comments: 'Kommentarer',
    yourEmail: 'din@epost.no',
  },
  sv: {
    crm: 'CRM',
    customerRelationshipManagement: 'Kundrelationshantering',
    noRestaurantFound: 'Ingen restaurang hittades',
    pleaseAddRestaurant: 'Lägg till en restaurang först i Restaurang-sektionen.',
    loading: 'Laddar CRM…',
    overview: 'Översikt',
    emailAutomation: 'E-postautomation',
    campaigns: 'Kampanjer',
    guestFeedback: 'Gästfeedback',
    analyticsDashboard: 'Analyspanel',
    realTimeInsights: 'Realtidsinsikter om gästengagemang och kampanjresultat',
    live: 'Live',
    updatedAt: 'Uppdaterad {time}',
    refresh: 'Uppdatera',
    refreshing: 'Uppdaterar…',
    emailsSent: 'Skickade e-postmeddelanden',
    last30Days: 'Senaste 30 dagarna',
    surveyResponses: 'Enkätsvar',
    responseRate: 'Svarsfrekvens',
    avgOverallRating: 'Genomsnittligt totalbetyg',
    outOf5: 'av 5 stjärnor',
    offerPerformance: 'Erbjudandeprestanda',
    trackReturnVisits: 'Spåra hur dina återbesökserbjudanden presterar',
    offersSent: 'Erbjudanden skickade',
    linkClicks: 'Länkklick',
    clickThroughRate: 'klickfrekvens',
    reservationsBooked: 'Bokningar gjorda',
    conversionFromClicks: 'konvertering från klick',
    redeemedVisits: 'Inlösta besök',
    completedVisits: 'genomförda besök',
    redemptionRate: 'Inlösningsgrad',
    ofTotalOffersSent: 'av totala erbjudanden skickade',
    campaignRevenue: 'Kampanjintäkter',
    estimatedRevenueFromCampaigns: 'Beräknade intäkter från kampanjdrivna bokningar',
    estimatedRevenueGenerated: 'Beräknade intäkter genererade',
    fromCampaignReservations: 'från kampanjbokningar, efter rabatt',
    bookings: 'bokningar',
    redeemed: 'inlösta',
    averageRatings: 'Genomsnittliga betyg',
    guestSatisfaction: 'Gästnöjdhet inom alla kategorier',
    overall: 'Totalt',
    food: 'Mat',
    service: 'Service',
    atmosphere: 'Atmosfär',
    publicReviewFunnel: 'Offentlig recensionstrakt',
    guestAdvocacy: 'Gästförespråkande och offentliga recensioner',
    positiveSubmissions: 'Positiva inskick',
    ofTotalResponses: 'av totala svar',
    googleReviewPrompts: 'Google-recensionsuppmaningar',
    shownToEligibleGuests: 'visas för berättigade gäster',
    tripAdvisorPrompts: 'TripAdvisor-uppmaningar',
    recentGuestFeedback: 'Senaste gästfeedback',
    latestSubmissions: 'Senaste inskickade feedback',
    new: 'nya',
    noFeedbackCollected: 'Ingen feedback insamlad ännu',
    guestResponsesAppear: 'Gästsvar visas här när de skickar in enkäten',
    anonymousGuest: 'Anonym gäst',
    feedbackDetail: 'Feedbackdetaljer',
    linkedReservation: 'Länkad bokning',
    visitDate: 'Besöksdatum',
    time: 'Tid',
    partySize: 'Sällskapsstorlek',
    table: 'Bord',
    status: 'Status',
    surveyLink: 'Enkätlänk',
    copy: 'Kopiera',
    responsesCollected: 'Svar insamlade via ditt tack-e-postmeddelande.',
    exportCSV: 'Exportera CSV',
    totalResponses: 'Totala svar',
    avgFood: 'Gen. mat',
    avgService: 'Gen. service',
    avgAtmosphere: 'Gen. atmosfär',
    avgOverall: 'Gen. totalt',
    listView: 'Listvy',
    summary: 'Sammanfattning',
    averageByCategory: 'Genomsnitt per kategori',
    ratingDistribution: 'Betygsfördelning',
    positive: 'positiv',
    neutral: 'neutral',
    negative: 'negativ',
    searchByEmailOrComment: 'Sök efter e-post eller kommentar…',
    allRatings: 'Alla betyg',
    positive4: 'Positiv (4+)',
    neutral3: 'Neutral (3–4)',
    negativeBelow3: 'Negativ (under 3)',
    newestFirst: 'Nyaste först',
    oldestFirst: 'Äldsta först',
    dateRange: 'Datumintervall:',
    to: 'till',
    clearDates: 'Rensa datum',
    shownOf: '{filtered} av {total} visas',
    noFeedbackMatches: 'Ingen feedback matchar dina filter.',
    configureWorkflow: 'Konfigurera ditt tack-e-postarbetsflöde och visa skickade e-postmeddelanden.',
    saveSettings: 'Spara inställningar',
    saving: 'Sparar…',
    saved: 'Sparad!',
    settings: 'Inställningar',
    test: 'Test',
    emailLog: 'E-postlogg',
    automationActive: 'Automation aktiv — skickar kl {time} dagen efter varje besök',
    automationOff: 'Automation är avstängd',
    offerEnabled: 'erbjudande aktiverat',
    offerDisabled: 'erbjudande inaktiverat',
    surveyEnabled: 'enkät aktiverad',
    surveyDisabled: 'enkät inaktiverad',
    reviewThreshold: 'Recensionströskel {threshold}★',
    enableBelow: 'Aktivera nedan för att börja skicka tack-e-postmeddelanden automatiskt.',
    sendTime: 'Skicka tid',
    whenEmailSent: 'När e-postmeddelandet skickas dagen efter bokningen.',
    testingTip: 'Testtips: ställ in detta till aktuell timme, kör sedan gcloud scheduler jobs run från terminalen.',
    thankYouMessage: 'Tack-meddelande',
    openingMessage: 'Öppningsmeddelandet som gäster får. Klicka på en tagg för att infoga den.',
    returnVisitOffer: 'Återbesökserbjudande',
    attachExistingOffer: 'Bifoga ett av dina befintliga erbjudanden till tack-e-postmeddelandet.',
    loadingOffers: 'Laddar dina erbjudanden…',
    noOffersYet: 'Du har inga erbjudanden ännu. Skapa ett i Erbjudanden-fliken först.',
    selectOffer: 'Välj erbjudande',
    howOfferLinkWorks: 'Hur erbjudandelänken fungerar',
    offerLinkDescription: 'När en gäst klickar på "Boka ditt nästa besök" loggas klicket, och de hamnar på bokningssidan med erbjudandekoden. När de slutför den bokningen krediteras det automatiskt till denna kampanj — så du kan se klick, bokningar och inlösen i Översikt-fliken.',
    campaignRevenueTracking: 'Kampanjintäktsspårning',
    usedToEstimateRevenue: 'Används för att beräkna intäkter från gäster som bokar med ett kampanjerbjudande.',
    averageRevenuePerGuest: 'Genomsnittlig intäkt per gäst',
    averageAmountSpent: 'Genomsnittligt belopp en gäst vanligtvis spenderar under ett besök. Ingen valutasymbol — bara ett nummer.',
    feedbackSurvey: 'Feedback-enkät',
    collectStarRatings: 'Samla stjärnbetyg och skriftliga kommentarer från gäster efter besöket.',
    chooseQuestions: 'Välj vilka frågor som visas i enkäten.',
    foodQuality: 'Matkvalitet (1–5 stjärnor)',
    serviceLabel: 'Service (1–5 stjärnor)',
    atmosphereLabel: 'Atmosfär (1–5 stjärnor)',
    overallExperience: 'Helhetsupplevelse (1–5 stjärnor)',
    additionalComments: 'Ytterligare kommentarer (fri text)',
    enableToCollectFeedback: 'Aktivera för att samla strukturerad feedback från dina gäster.',
    publicReviewFunnelSettings: 'Offentlig recensionstrakt',
    promptSatisfiedGuests: 'Uppmana nöjda gäster att lämna en offentlig recension på Google eller TripAdvisor.',
    suggestReviewIfAbove: 'Föreslå offentlig recension om genomsnittsbetyget är över',
    andAbove: 'och över',
    only: 'endast',
    googleReviewUrl: 'Google-recension URL',
    tripAdvisorUrl: 'TripAdvisor-recension URL',
    howReviewFunnelWorks: 'Hur recensionstrakten fungerar',
    reviewFunnelDescription: 'Efter att en gäst skickar in feedback beräknas genomsnittet av alla betyg. Om det överstiger tröskeln visas Google- eller TripAdvisor-recensionsknappar. Om under, visas ett artigt tack utan recensionslänkar.',
    sentEmailLog: 'Skickad e-postlogg',
    reservationsReceivedEmail: 'Bokningar som fick ett tack-e-postmeddelande.',
    guest: 'Gäst',
    email: 'E-post',
    visitDateLabel: 'Besöksdatum',
    sentAt: 'Skickat',
    statusSent: 'Skickat',
    showingMostRecent: 'Visar 50 senaste poster',
    noThankYouEmails: 'Inga tack-e-postmeddelanden skickade ännu',
    emailsAppearAfter: 'E-postmeddelanden visas här efter att den schemalagda funktionen körs',
    sendPreviewEmail: 'Skicka ett förhandsgransknings-e-post',
    sendRealEmail: 'Skickar ett riktigt e-post med dina nuvarande inställningar så att du kan se exakt vad gäster får. Använder din befintliga sendEmail Cloud Function.',
    sendPreview: 'Skicka förhandsgranskning',
    whatThisSends: 'Vad detta skickar',
    yourThankYouMessage: 'Ditt tack-meddelande med platshållare för gäst/bokning',
    returnVisitOfferLabel: 'Återbesökserbjudande',
    feedbackSurveyLabel: 'Feedback-enkätknapp — länkar till /feedback/PREVIEW (visar inte hittad eftersom det är en förhandsgranskning, inte en riktig bokning)',
    testWarningBanner: 'Orange varningsbanderoll överst som markerar det som ett test',
    previewNote: 'Obs: förhandsgranskningens erbjudandeknapp länkar direkt till bokningssidan (inte via klickspårning), så att skicka ett test påverkar inte din Erbjudandeprestanda-statistik.',
    preFlightChecklist: 'Före-flyg-checklista',
    checksEveryCondition: 'Kontrollerar alla villkor som den schemalagda funktionen verifierar innan sändning. Kör detta för att diagnostisera varför e-post inte skickas.',
    reRun: 'Kör igen',
    checking: 'Kontrollerar…',
    runningChecks: 'Kör kontroller mot Firestore…',
    checkedAt: 'Kontrollerad {time}',
    passed: 'godkänd',
    emailAutomationEnabled: 'E-postautomation aktiverad',
    enabledInSettings: 'Aktiverad i inställningar',
    turnOnFirst: 'Aktivera i Inställningar-panelen först',
    sendHourMatches: 'Skicka-timme matchar aktuell timme',
    bothSetTo: 'Båda inställda på {hour} ✓',
    configuredVsCurrent: 'Konfigurerad: {config}:00 — Aktuell server-timme: {current}:00. Gå till Inställningar och ändra Skicka tid till "{suggest}", spara, kör sedan denna checklista igen.',
    crmSettingsSaved: 'crm_settings sparad till Firestore',
    settingsDocFound: 'Inställningsdokument hittades (du laddade dem framgångsrikt)',
    yesterdayReservationsFound: 'Gårdagens bokningar hittades',
    foundReservation: 'Hittade: {name}',
    noReservationsYesterday: 'Inga bokningar hittades för igår. Skapa en testbokning med gårdagens datum.',
    reservationHasEmail: 'Bokningen har kundens e-post',
    hasEmail: 'har e-post',
    noEmail: 'Ingen e-post på exempelbokningen — lägg till en i Firestore.',
    statusConfirmedOrCompleted: 'Status är bekräftad eller slutförd',
    statusIs: 'Status: {status}',
    changeToConfirmed: 'Status är "{status}" — ändra den till bekräftad eller slutförd.',
    emailNotAlreadySent: 'E-post inte redan skickad',
    notYetSent: 'Inte skickad än för denna bokning',
    alreadySent: 'thankYouEmailSent är redan true — ta bort detta fält i Firestore för att testa igen.',
    firestoreIndexExists: 'Firestore-index för e-postlogg',
    indexExists: 'Sammansatt index finns',
    indexMissing: 'Index saknas. En skapningslänk loggades till webbläsarens konsol (F12 → Console-fliken). Klicka på den och vänta ~1 minut, kör sedan igen.',
    createIndexInFirebase: 'Skapa index i Firebase Console',
    openFirestoreIndexes: 'Öppna Firestore-index',
    manuallyTrigger: 'Utlös den schemalagda funktionen manuellt',
    forcesFunction: 'Tvingar funktionen att köras nu utan att vänta på nästa timtick.',
    step1FindJob: '# Steg 1 — hitta schemaläggningsjobbet',
    step2Trigger: '# Steg 2 — utlös det omedelbart',
    step3WatchLogs: '# Steg 3 — se loggarna live',
    hourMustMatch: 'Timme måste matcha',
    currentHour: 'Aktuell timme: {hour}. Ställ in Skicka tid i Inställningar till denna exakta timme, spara, utlös sedan.',
    dateMustBeYesterday: 'Datum måste vara igår',
    functionLooksForYesterday: 'Funktionen letar efter bokningar där reservation_date är igår. Skapa en testbokning daterad igår.',
    checkLogsForErrors: 'Kontrollera loggar för fel',
    lookForErrors: 'Leta efter ✅ eller ❌-rader i Cloud Functions-loggen. Simulerade sändningar visas när RESEND_API_KEY inte är bunden.',
    comments: 'Kommentarer',
    yourEmail: 'din@email.se',
  },
  de: {
    crm: 'CRM',
    customerRelationshipManagement: 'Kundenbeziehungsmanagement',
    noRestaurantFound: 'Kein Restaurant gefunden',
    pleaseAddRestaurant: 'Bitte fügen Sie zuerst ein Restaurant im Restaurant-Bereich hinzu.',
    loading: 'Lade CRM…',
    overview: 'Übersicht',
    emailAutomation: 'E-Mail-Automatisierung',
    campaigns: 'Kampagnen',
    guestFeedback: 'Gästefeedback',
    analyticsDashboard: 'Analyse-Dashboard',
    realTimeInsights: 'Echtzeit-Einblicke in Gästeengagement und Kampagnenleistung',
    live: 'Live',
    updatedAt: 'Aktualisiert {time}',
    refresh: 'Aktualisieren',
    refreshing: 'Aktualisiere…',
    emailsSent: 'Gesendete E-Mails',
    last30Days: 'Letzte 30 Tage',
    surveyResponses: 'Umfrageantworten',
    responseRate: 'Rücklaufquote',
    avgOverallRating: 'Durchschnittliche Gesamtbewertung',
    outOf5: 'von 5 Sternen',
    offerPerformance: 'Angebotsleistung',
    trackReturnVisits: 'Verfolgen Sie, wie Ihre Rückkehrangebote abschneiden',
    offersSent: 'Angebote gesendet',
    linkClicks: 'Link-Klicks',
    clickThroughRate: 'Klickrate',
    reservationsBooked: 'Reservierungen gebucht',
    conversionFromClicks: 'Konversion von Klicks',
    redeemedVisits: 'Eingelöste Besuche',
    completedVisits: 'abgeschlossene Besuche',
    redemptionRate: 'Einlösungsrate',
    ofTotalOffersSent: 'der gesendeten Angebote',
    campaignRevenue: 'Kampagnenumsatz',
    estimatedRevenueFromCampaigns: 'Geschätzter Umsatz aus kampagnengesteuerten Buchungen',
    estimatedRevenueGenerated: 'Geschätzter generierter Umsatz',
    fromCampaignReservations: 'aus Kampagnenreservierungen, nach Rabatt',
    bookings: 'Buchungen',
    redeemed: 'eingelöst',
    averageRatings: 'Durchschnittliche Bewertungen',
    guestSatisfaction: 'Gästezufriedenheit in allen Kategorien',
    overall: 'Gesamt',
    food: 'Essen',
    service: 'Service',
    atmosphere: 'Atmosphäre',
    publicReviewFunnel: 'Öffentlicher Bewertungstrichter',
    guestAdvocacy: 'Gästeempfehlungen und öffentliche Bewertungen',
    positiveSubmissions: 'Positive Rückmeldungen',
    ofTotalResponses: 'aller Antworten',
    googleReviewPrompts: 'Google-Bewertungsaufforderungen',
    shownToEligibleGuests: 'berechtigten Gästen angezeigt',
    tripAdvisorPrompts: 'TripAdvisor-Aufforderungen',
    recentGuestFeedback: 'Letztes Gästefeedback',
    latestSubmissions: 'Neueste Einsendungen',
    new: 'neu',
    noFeedbackCollected: 'Noch kein Feedback gesammelt',
    guestResponsesAppear: 'Gästeantworten erscheinen hier, sobald sie die Umfrage abschließen',
    anonymousGuest: 'Anonymer Gast',
    feedbackDetail: 'Feedback-Details',
    linkedReservation: 'Verknüpfte Reservierung',
    visitDate: 'Besuchsdatum',
    time: 'Uhrzeit',
    partySize: 'Gruppengröße',
    table: 'Tisch',
    status: 'Status',
    surveyLink: 'Umfragelink',
    copy: 'Kopieren',
    responsesCollected: 'Antworten gesammelt über Ihre Dankes-E-Mail.',
    exportCSV: 'CSV exportieren',
    totalResponses: 'Antworten gesamt',
    avgFood: 'Ø Essen',
    avgService: 'Ø Service',
    avgAtmosphere: 'Ø Atmosphäre',
    avgOverall: 'Ø Gesamt',
    listView: 'Listenansicht',
    summary: 'Zusammenfassung',
    averageByCategory: 'Durchschnitt nach Kategorie',
    ratingDistribution: 'Bewertungsverteilung',
    positive: 'positiv',
    neutral: 'neutral',
    negative: 'negativ',
    searchByEmailOrComment: 'Nach E-Mail oder Kommentar suchen…',
    allRatings: 'Alle Bewertungen',
    positive4: 'Positiv (4+)',
    neutral3: 'Neutral (3–4)',
    negativeBelow3: 'Negativ (unter 3)',
    newestFirst: 'Neueste zuerst',
    oldestFirst: 'Älteste zuerst',
    dateRange: 'Zeitraum:',
    to: 'bis',
    clearDates: 'Daten löschen',
    shownOf: '{filtered} von {total} angezeigt',
    noFeedbackMatches: 'Kein Feedback entspricht Ihren Filtern.',
    configureWorkflow: 'Konfigurieren Sie Ihren Dankes-E-Mail-Workflow und sehen Sie gesendete E-Mails.',
    saveSettings: 'Einstellungen speichern',
    saving: 'Speichere…',
    saved: 'Gespeichert!',
    settings: 'Einstellungen',
    test: 'Test',
    emailLog: 'E-Mail-Protokoll',
    automationActive: 'Automatisierung aktiv — sendet um {time} am Tag nach jedem Besuch',
    automationOff: 'Automatisierung ist aus',
    offerEnabled: 'Angebot aktiviert',
    offerDisabled: 'Angebot deaktiviert',
    surveyEnabled: 'Umfrage aktiviert',
    surveyDisabled: 'Umfrage deaktiviert',
    reviewThreshold: 'Bewertungsschwelle {threshold}★',
    enableBelow: 'Aktivieren Sie unten, um automatisch Dankes-E-Mails zu versenden.',
    sendTime: 'Sendezeit',
    whenEmailSent: 'Wann die E-Mail am Tag nach der Reservierung gesendet wird.',
    testingTip: 'Testtipp: Stellen Sie dies auf die aktuelle Stunde ein und führen Sie dann gcloud scheduler jobs run aus dem Terminal aus.',
    thankYouMessage: 'Dankesnachricht',
    openingMessage: 'Die Begrüßungsnachricht, die Gäste erhalten. Klicken Sie auf ein Tag, um es einzufügen.',
    returnVisitOffer: 'Rückkehrangebot',
    attachExistingOffer: 'Fügen Sie eines Ihrer bestehenden Angebote an die Dankes-E-Mail an.',
    loadingOffers: 'Lade Ihre Angebote…',
    noOffersYet: 'Sie haben noch keine Angebote. Erstellen Sie zuerst eines im Angebote-Tab.',
    selectOffer: 'Angebot auswählen',
    howOfferLinkWorks: 'Wie der Angebotslink funktioniert',
    offerLinkDescription: 'Wenn ein Gast auf "Nächsten Besuch buchen" klickt, wird der Klick protokolliert und der Gast landet auf der Buchungsseite mit dem Angebotscode. Wenn er die Buchung abschließt, wird sie automatisch dieser Kampagne gutgeschrieben — so können Sie Klicks, Buchungen und Einlösungen alle im Übersicht-Tab sehen.',
    campaignRevenueTracking: 'Kampagnenumsatz-Tracking',
    usedToEstimateRevenue: 'Wird verwendet, um den Umsatz zu schätzen, der von Gästen generiert wird, die mit einem Kampagnenangebot buchen.',
    averageRevenuePerGuest: 'Durchschnittlicher Umsatz pro Gast',
    averageAmountSpent: 'Durchschnittlicher Betrag, den ein Gast typischerweise während eines Besuchs ausgibt. Kein Währungssymbol — nur eine Zahl.',
    feedbackSurvey: 'Feedback-Umfrage',
    collectStarRatings: 'Sammeln Sie Sternebewertungen und schriftliche Kommentare von Gästen nach dem Besuch.',
    chooseQuestions: 'Wählen Sie, welche Fragen in der Umfrage erscheinen.',
    foodQuality: 'Essensqualität (1–5 Sterne)',
    serviceLabel: 'Service (1–5 Sterne)',
    atmosphereLabel: 'Atmosphäre (1–5 Sterne)',
    overallExperience: 'Gesamterlebnis (1–5 Sterne)',
    additionalComments: 'Zusätzliche Kommentare (Freitext)',
    enableToCollectFeedback: 'Aktivieren Sie, um strukturiertes Feedback von Ihren Gästen zu sammeln.',
    publicReviewFunnelSettings: 'Öffentlicher Bewertungstrichter',
    promptSatisfiedGuests: 'Fordern Sie zufriedene Gäste auf, eine öffentliche Bewertung auf Google oder TripAdvisor zu hinterlassen.',
    suggestReviewIfAbove: 'Öffentliche Bewertung vorschlagen, wenn die Durchschnittsbewertung über',
    andAbove: 'und darüber',
    only: 'nur',
    googleReviewUrl: 'Google-Bewertungs-URL',
    tripAdvisorUrl: 'TripAdvisor-Bewertungs-URL',
    howReviewFunnelWorks: 'Wie der Bewertungstrichter funktioniert',
    reviewFunnelDescription: 'Nachdem ein Gast Feedback abgegeben hat, wird der Durchschnitt aller Bewertungen berechnet. Wenn er den Schwellenwert überschreitet, werden Google- oder TripAdvisor-Bewertungsbuttons angezeigt. Wenn darunter, wird ein höfliches Dankeschön ohne Bewertungslinks angezeigt.',
    sentEmailLog: 'Gesendetes E-Mail-Protokoll',
    reservationsReceivedEmail: 'Reservierungen, die eine Dankes-E-Mail erhalten haben.',
    guest: 'Gast',
    email: 'E-Mail',
    visitDateLabel: 'Besuchsdatum',
    sentAt: 'Gesendet',
    statusSent: 'Gesendet',
    showingMostRecent: 'Zeige 50 neueste Einträge',
    noThankYouEmails: 'Noch keine Dankes-E-Mails gesendet',
    emailsAppearAfter: 'E-Mails erscheinen hier, nachdem die geplante Funktion ausgeführt wurde',
    sendPreviewEmail: 'Vorschau-E-Mail senden',
    sendRealEmail: 'Sendet eine echte E-Mail mit Ihren aktuellen Einstellungen, damit Sie genau sehen können, was Gäste erhalten. Verwendet Ihre vorhandene sendEmail Cloud Function.',
    sendPreview: 'Vorschau senden',
    whatThisSends: 'Was dies sendet',
    yourThankYouMessage: 'Ihre Dankesnachricht mit Platzhalter-Gast/Reservierung',
    returnVisitOfferLabel: 'Rückkehrangebot',
    feedbackSurveyLabel: 'Feedback-Umfrage-Button — verlinkt zu /feedback/PREVIEW (zeigt nicht gefunden, da es eine Vorschau und keine echte Reservierung ist)',
    testWarningBanner: 'Oranges Warnbanner oben, das es als Test markiert',
    previewNote: 'Hinweis: Der Angebotsbutton in der Vorschau verlinkt direkt zur Buchungsseite (nicht über Click-Tracking), daher beeinflusst das Senden eines Tests nicht Ihre Angebotsleistungs-Statistiken.',
    preFlightChecklist: 'Pre-Flight-Checkliste',
    checksEveryCondition: 'Überprüft alle Bedingungen, die die geplante Funktion vor dem Senden prüft. Führen Sie dies aus, um zu diagnostizieren, warum E-Mails nicht versendet werden.',
    reRun: 'Erneut ausführen',
    checking: 'Prüfe…',
    runningChecks: 'Führe Prüfungen gegen Firestore durch…',
    checkedAt: 'Geprüft um {time}',
    passed: 'bestanden',
    emailAutomationEnabled: 'E-Mail-Automatisierung aktiviert',
    enabledInSettings: 'In Einstellungen aktiviert',
    turnOnFirst: 'Aktivieren Sie zuerst im Einstellungen-Panel',
    sendHourMatches: 'Sendestunde entspricht aktueller Stunde',
    bothSetTo: 'Beide auf {hour} eingestellt ✓',
    configuredVsCurrent: 'Konfiguriert: {config}:00 — Aktuelle Serverstunde: {current}:00. Gehen Sie zu Einstellungen und ändern Sie Sendezeit auf "{suggest}", speichern Sie und führen Sie diese Checkliste erneut aus.',
    crmSettingsSaved: 'crm_settings in Firestore gespeichert',
    settingsDocFound: 'Einstellungsdokument gefunden (erfolgreich geladen)',
    yesterdayReservationsFound: 'Reservierungen von gestern gefunden',
    foundReservation: 'Gefunden: {name}',
    noReservationsYesterday: 'Keine Reservierungen für gestern gefunden. Erstellen Sie eine Testreservierung mit dem gestrigen Datum.',
    reservationHasEmail: 'Reservierung hat Kunden-E-Mail',
    hasEmail: 'hat E-Mail',
    noEmail: 'Keine E-Mail bei der Beispielreservierung — fügen Sie eine in Firestore hinzu.',
    statusConfirmedOrCompleted: 'Status ist bestätigt oder abgeschlossen',
    statusIs: 'Status: {status}',
    changeToConfirmed: 'Status ist "{status}" — ändern Sie ihn zu bestätigt oder abgeschlossen.',
    emailNotAlreadySent: 'E-Mail noch nicht gesendet',
    notYetSent: 'Noch nicht gesendet für diese Reservierung',
    alreadySent: 'thankYouEmailSent ist bereits true — löschen Sie dieses Feld in Firestore, um erneut zu testen.',
    firestoreIndexExists: 'Firestore-Index für E-Mail-Protokoll',
    indexExists: 'Composite-Index existiert',
    indexMissing: 'Index fehlt. Ein Erstellungslink wurde in der Browser-Konsole protokolliert (F12 → Console-Tab). Klicken Sie darauf und warten Sie ~1 Minute, führen Sie dann erneut aus.',
    createIndexInFirebase: 'Index in Firebase Console erstellen',
    openFirestoreIndexes: 'Firestore-Indizes öffnen',
    manuallyTrigger: 'Geplante Funktion manuell auslösen',
    forcesFunction: 'Erzwingt die Ausführung der Funktion jetzt, ohne auf den nächsten Stundentakt zu warten.',
    step1FindJob: '# Schritt 1 — finden Sie den Scheduler-Job-Namen',
    step2Trigger: '# Schritt 2 — sofort auslösen',
    step3WatchLogs: '# Schritt 3 — Logs live ansehen',
    hourMustMatch: 'Stunde muss übereinstimmen',
    currentHour: 'Aktuelle Stunde: {hour}. Stellen Sie Sendezeit in Einstellungen auf diese genaue Stunde ein, speichern Sie und lösen Sie aus.',
    dateMustBeYesterday: 'Datum muss gestern sein',
    functionLooksForYesterday: 'Die Funktion sucht nach Reservierungen, bei denen reservation_date gestern ist. Erstellen Sie eine Testreservierung mit dem gestrigen Datum.',
    checkLogsForErrors: 'Logs auf Fehler prüfen',
    lookForErrors: 'Suchen Sie nach ✅ oder ❌-Zeilen im Cloud Functions-Log. Simulierte Sendungen erscheinen, wenn RESEND_API_KEY nicht gebunden ist.',
    comments: 'Kommentare',
    yourEmail: 'ihre@email.de',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ value, size = "md" }) {
  const sz = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`${sz} ${s <= value ? "text-[#fe8a24]" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function Toggle({ enabled, onChange }) {
  return (
    <div onClick={() => onChange(!enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${enabled ? "bg-[#fe8a24]" : "bg-gray-300"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </div>
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-50 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 font-medium">{subtitle}</p>}
        </div>
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, sub, color = "orange", icon, trend }) {
  const colors = { 
    orange: "text-[#fe8a24]", 
    green: "text-emerald-600", 
    blue: "text-blue-600", 
    purple: "text-purple-600", 
    gray: "text-gray-500",
    rose: "text-rose-500",
    indigo: "text-indigo-600"
  };
  
  const bgColors = {
    orange: "bg-orange-50",
    green: "bg-emerald-50",
    blue: "bg-blue-50",
    purple: "bg-purple-50",
    gray: "bg-gray-50",
    rose: "bg-rose-50",
    indigo: "bg-indigo-50"
  };
  
  const iconColors = {
    orange: "text-orange-500",
    green: "text-emerald-500",
    blue: "text-blue-500",
    purple: "text-purple-500",
    gray: "text-gray-400",
    rose: "text-rose-500",
    indigo: "text-indigo-500"
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-200 hover:border-gray-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl font-bold ${colors[color] || colors.orange}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>}
          {trend && (
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold ${trend > 0 ? "text-emerald-600" : "text-rose-500"}`}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d={trend > 0 ? "M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" : "M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"} />
              </svg>
              {trend > 0 ? "+" : ""}{trend}%
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl ${bgColors[color]} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
            <svg className={`w-5 h-5 ${iconColors[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function RefreshButton({ onClick, refreshing, t }) {
  return (
    <button onClick={onClick} disabled={refreshing} className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-[#fe8a24] border border-gray-200 hover:border-[#fe8a24] rounded-xl px-4 py-2 transition-all duration-200 disabled:opacity-50 flex-shrink-0 hover:shadow-sm">
      <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {refreshing ? t('refreshing') : t('refresh')}
    </button>
  );
}

function pct(numerator, denominator) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function CRMOverview({ restaurantId }) {
  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  
  const t = (key) => {
    return (i18n[lang] && i18n[lang][key]) || (i18n.en && i18n.en[key]) || key;
  };

  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  const [stats, setStats] = useState({
    emailsSent: 0, feedbackCount: 0, avgOverall: "0.0", avgFood: "0.0", avgService: "0.0", avgAtmosphere: "0.0",
    positiveCount: 0, responseRate: 0,
    offersSent: 0, offerClicks: 0, offerReservationsCreated: 0, offersRedeemed: 0,
    estimatedRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [hoveredMetric, setHoveredMetric] = useState(null);

  const load = useCallback(async (isManualRefresh = false) => {
    if (!restaurantId) return;
    if (isManualRefresh) setRefreshing(true); else setLoading(true);
    try {
      const fbQuery = query(collection(firestore, "feedback"), where("restaurantId", "==", restaurantId), orderBy("createdAt", "desc"));
      const fbSnap = await getDocs(fbQuery);
      const feedbacks = fbSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const logSnap = await getDoc(doc(firestore, "crm_stats", restaurantId));
      const logData = logSnap.exists() ? logSnap.data() : {};
      const count = feedbacks.length;
      const avgField = (field) => count > 0 ? (feedbacks.reduce((s, f) => s + (f[field] || 0), 0) / count).toFixed(1) : "0.0";
      const positive = feedbacks.filter((f) => (((f.foodRating || 0) + (f.serviceRating || 0) + (f.atmosphereRating || 0) + (f.overallRating || 0)) / 4) >= 4.5).length;
      setStats({
        emailsSent: logData.emailsSent || 0,
        feedbackCount: count,
        avgOverall: avgField("overallRating"), avgFood: avgField("foodRating"), avgService: avgField("serviceRating"), avgAtmosphere: avgField("atmosphereRating"),
        positiveCount: positive,
        responseRate: logData.emailsSent > 0 ? Math.round((count / logData.emailsSent) * 100) : 0,
        offersSent: logData.offersSent || 0,
        offerClicks: logData.offerClicks || 0,
        offerReservationsCreated: logData.offerReservationsCreated || 0,
        offersRedeemed: logData.offersRedeemed || 0,
        estimatedRevenue: logData.estimatedRevenue || 0,
      });
      setRecentFeedback(feedbacks.slice(0, 5));
      setLastUpdated(new Date());
    } catch (e) { console.error("CRM Overview load error:", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [restaurantId]);

  useEffect(() => { load(false); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#fe8a24] border-t-transparent mx-auto mb-4" />
        <p className="text-sm text-gray-400 font-medium">{t('loading')}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-[#fe8a24] to-orange-300 rounded-full" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('analyticsDashboard')}</h2>
            <p className="text-sm text-gray-400 font-medium">{t('realTimeInsights')}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>{t('live')}</span>
            <span className="hidden sm:inline">· {lastUpdated ? t('updatedAt').replace('{time}', lastUpdated.toLocaleTimeString()) : ""}</span>
          </div>
          <RefreshButton onClick={() => load(true)} refreshing={refreshing} t={t} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard 
          label={t('emailsSent')} 
          value={stats.emailsSent} 
          color="orange" 
          icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          sub={t('last30Days')}
        />
        <MetricCard 
          label={t('surveyResponses')} 
          value={stats.feedbackCount} 
          color="blue" 
          icon="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
        <MetricCard 
          label={t('responseRate')} 
          value={`${stats.responseRate}%`} 
          color="green" 
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          sub={`${stats.feedbackCount} of ${stats.emailsSent} ${t('responses')}`}
        />
        <MetricCard 
          label={t('avgOverallRating')} 
          value={stats.avgOverall} 
          color="purple" 
          icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          sub={t('outOf5')}
        />
      </div>

      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-400 rounded-full" />
          <div>
            <h3 className="text-sm font-bold text-gray-700 tracking-tight">{t('offerPerformance')}</h3>
            <p className="text-xs text-gray-400 font-medium">{t('trackReturnVisits')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard 
            label={t('offersSent')} 
            value={stats.offersSent} 
            color="orange" 
            icon="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
          <MetricCard 
            label={t('linkClicks')} 
            value={stats.offerClicks} 
            color="blue" 
            icon="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            sub={pct(stats.offerClicks, stats.offersSent) + " " + t('clickThroughRate')}
          />
          <MetricCard 
            label={t('reservationsBooked')} 
            value={stats.offerReservationsCreated} 
            color="purple" 
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            sub={pct(stats.offerReservationsCreated, stats.offerClicks) + " " + t('conversionFromClicks')}
          />
          <MetricCard 
            label={t('redeemedVisits')} 
            value={stats.offersRedeemed} 
            color="green" 
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            sub={t('completedVisits')}
          />
          <MetricCard 
            label={t('redemptionRate')} 
            value={pct(stats.offersRedeemed, stats.offersSent)} 
            color="rose" 
            icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            sub={t('ofTotalOffersSent')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-green-400 rounded-full" />
            <div>
              <h3 className="text-sm font-bold text-gray-700 tracking-tight">{t('campaignRevenue')}</h3>
              <p className="text-xs text-gray-400 font-medium">{t('estimatedRevenueFromCampaigns')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 rounded-2xl border border-emerald-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{t('estimatedRevenueGenerated')}</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-2">{stats.estimatedRevenue.toLocaleString()}</p>
                  <p className="text-xs text-emerald-500 mt-1 font-medium">{t('fromCampaignReservations')}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-emerald-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full" />
                  {stats.offerReservationsCreated} {t('bookings')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-emerald-300 rounded-full" />
                  {stats.offersRedeemed} {t('redeemed')}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 bg-gradient-to-b from-orange-400 to-yellow-300 rounded-full" />
            <div>
              <h3 className="text-sm font-bold text-gray-700 tracking-tight">{t('averageRatings')}</h3>
              <p className="text-xs text-gray-400 font-medium">{t('guestSatisfaction')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
              label={t('overall')} 
              value={stats.avgOverall} 
              color="orange" 
              sub={t('outOf5')} 
              icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
            <MetricCard 
              label={t('food')} 
              value={stats.avgFood} 
              color="orange" 
              sub={t('outOf5')} 
              icon="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
            <MetricCard 
              label={t('service')} 
              value={stats.avgService} 
              color="orange" 
              sub={t('outOf5')} 
              icon="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
            <MetricCard 
              label={t('atmosphere')} 
              value={stats.avgAtmosphere} 
              color="orange" 
              sub={t('outOf5')} 
              icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full" />
          <div>
            <h3 className="text-sm font-bold text-gray-700 tracking-tight">{t('publicReviewFunnel')}</h3>
            <p className="text-xs text-gray-400 font-medium">{t('guestAdvocacy')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard 
            label={t('positiveSubmissions')} 
            value={stats.positiveCount} 
            color="green" 
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            sub={`${pct(stats.positiveCount, stats.feedbackCount)} ${t('ofTotalResponses')}`}
          />
          <MetricCard 
            label={t('googleReviewPrompts')} 
            value={stats.positiveCount} 
            color="blue" 
            icon="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            sub={t('shownToEligibleGuests')}
          />
          <MetricCard 
            label={t('tripAdvisorPrompts')} 
            value={stats.positiveCount} 
            color="purple" 
            icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            sub={t('shownToEligibleGuests')}
          />
        </div>
      </div>

      <SectionCard 
        title={t('recentGuestFeedback')} 
        subtitle={t('latestSubmissions')} 
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">{recentFeedback.length} {t('new')}</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        }
      >
        {recentFeedback.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">{t('noFeedbackCollected')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('guestResponsesAppear')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentFeedback.map((fb, index) => {
              const avg = (((fb.foodRating || 0) + (fb.serviceRating || 0) + (fb.atmosphereRating || 0) + (fb.overallRating || 0)) / 4);
              const isPositive = avg >= 4;
              const submittedAt = fb.createdAt?.toDate ? fb.createdAt.toDate() : null;
              
              return (
                <div key={fb.id} className={`group relative bg-gradient-to-r from-gray-50/50 to-transparent hover:from-orange-50/30 transition-all duration-200 rounded-xl p-4 border border-gray-50 hover:border-orange-100 ${index > 0 ? "border-t" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPositive ? "bg-emerald-100" : "bg-gray-100"}`}>
                        <span className={`text-xs font-bold ${isPositive ? "text-emerald-600" : "text-gray-500"}`}>
                          {(fb.email || "G").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{fb.email || t('anonymousGuest')}</p>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                            {isPositive ? "★" : ""} {avg.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {[["Food", fb.foodRating], ["Service", fb.serviceRating], ["Atmosphere", fb.atmosphereRating], ["Overall", fb.overallRating]].map(([label, val]) => val !== null && val !== undefined && (
                            <span key={label} className="flex items-center gap-1 text-xs text-gray-500">
                              <span className="font-medium">{label}</span> <StarRating value={val} />
                            </span>
                          ))}
                        </div>
                        {fb.comments && (
                          <p className="text-sm text-gray-600 italic mt-2 bg-white rounded-xl px-3 py-2 border border-gray-100">"{fb.comments}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <span className="text-xs text-gray-400 font-medium">
                        {submittedAt ? submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Email Log ────────────────────────────────────────────────────────────────

function EmailLog({ restaurantId }) {
  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  
  const t = (key) => {
    return (i18n[lang] && i18n[lang][key]) || (i18n.en && i18n.en[key]) || key;
  };

  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isManualRefresh = false) => {
    if (!restaurantId) return;
    if (isManualRefresh) setRefreshing(true); else setLoading(true);
    try {
      const q = query(collection(firestore, "reservations"), where("restaurant_id", "==", restaurantId), where("thankYouEmailSent", "==", true), orderBy("thankYouEmailSentAt", "desc"), limit(50));
      const snap = await getDocs(q);
      setEmails(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      try {
        const q2 = query(collection(firestore, "reservations"), where("restaurant_id", "==", restaurantId), where("thankYouEmailSent", "==", true), limit(50));
        const snap2 = await getDocs(q2);
        const rows = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => { const tA = a.thankYouEmailSentAt?.toDate?.() || new Date(0); const tB = b.thankYouEmailSentAt?.toDate?.() || new Date(0); return tB - tA; });
        setEmails(rows);
      } catch (e2) { console.error("Email log load error:", e2); }
    } finally { setLoading(false); setRefreshing(false); }
  }, [restaurantId]);

  useEffect(() => { load(false); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#fe8a24]" /></div>;

  if (emails.length === 0) return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-500">{t('noThankYouEmails')}</p>
      <p className="text-xs text-gray-400 mt-1">{t('emailsAppearAfter')}</p>
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-4"><RefreshButton onClick={() => load(true)} refreshing={refreshing} t={t} /></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {[t('guest'), t('email'), t('visitDateLabel'), t('sentAt'), t('status')].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {emails.map((r) => {
              const visitDate = r.reservation_date?.toDate?.() || (r.reservation_date ? new Date(r.reservation_date) : null);
              const sentAt = r.thankYouEmailSentAt?.toDate?.() || null;
              return (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-gray-800 whitespace-nowrap">{r.customer_name || "—"}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{r.customer_email || "—"}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{visitDate ? visitDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{sentAt ? sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      {t('statusSent')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {emails.length === 50 && <p className="text-xs text-gray-400 text-center mt-4">{t('showingMostRecent')}</p>}
    </div>
  );
}

// ─── Email Automation ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  enabled: false, sendHour: "10",
  thankYouMessage: "Thank you for visiting {{restaurant_name}}.\n\nWe hope you had a wonderful experience and look forward to welcoming you again soon.",
  offerEnabled: false,
  selectedOfferId: "",
  avgRevenuePerGuest: "",
  surveyEnabled: true,
  surveyQuestions: { food: true, service: true, atmosphere: true, overall: true, comments: true },
  reviewThreshold: "4.5", googleReviewUrl: "", tripAdvisorUrl: "",
};

function EmailAutomation({ restaurantId, collectionName = "restaurants" }) {
  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  
  const t = (key) => {
    return (i18n[lang] && i18n[lang][key]) || (i18n.en && i18n.en[key]) || key;
  };

  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activePanel, setActivePanel] = useState("settings");

  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const [restaurantOffers, setRestaurantOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoadingOffers(true);
    getDocs(collection(firestore, collectionName, restaurantId, "offer"))
      .then((snap) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const active = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((o) => {
            if (o.is_active === false) return false;
            const start = o.start_date ? new Date(o.start_date) : null;
            const end = o.end_date ? new Date(o.end_date) : null;
            if (end) {
              const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
              if (endDay < today) return false;
            }
            if (start) {
              const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
              if (startDay > today) return false;
            }
            return true;
          });
        setRestaurantOffers(active);
      })
      .catch(console.error)
      .finally(() => setLoadingOffers(false));
  }, [restaurantId, collectionName]);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    getDoc(doc(firestore, "crm_settings", restaurantId))
      .then((snap) => { if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() }); })
      .catch(console.error).finally(() => setLoading(false));
  }, [restaurantId]);

  const set = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const setSurveyQ = (key, value) => setSettings((prev) => ({ ...prev, surveyQuestions: { ...prev.surveyQuestions, [key]: value } }));

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      await setDoc(doc(firestore, "crm_settings", restaurantId), settings, { merge: true });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error("Save settings error:", e); }
    finally { setSaving(false); }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const functions = getFunctions(undefined, "asia-southeast1");
      const sendEmailFn = httpsCallable(functions, "sendEmail");

      const restaurantName = "Your Restaurant (preview)";
      const thankYouHtml = (settings.thankYouMessage || "")
        .replace(/{{restaurant_name}}/g, restaurantName)
        .replace(/{{customer_first_name}}/g, "Test Guest")
        .replace(/{{customer_full_name}}/g, "Test Guest")
        .replace(/{{reservation_date}}/g, new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }))
        .replace(/{{reservation_time}}/g, "19:00")
        .replace(/{{party_size}}/g, "2")
        .replace(/\n/g, "<br/>");

      const selectedOfferForTest = restaurantOffers.find((o) => o.id === settings.selectedOfferId);
      const testOfferLink = selectedOfferForTest
        ? `https://dashboard.dinery.ai/reserve/${encodeURIComponent(restaurantId)}?offer=${encodeURIComponent(selectedOfferForTest.offer_id)}&offerId=${encodeURIComponent(selectedOfferForTest.id)}&source=preview`
        : "https://dashboard.dinery.ai/reserve/";
      const offerHtml = settings.offerEnabled && selectedOfferForTest ? `
        <div style="margin-top:20px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:10px;">
          <p style="margin:0 0 6px;font-weight:bold;color:#fe8a24;font-size:15px;">${selectedOfferForTest.offer_name || "Welcome Back Offer"}</p>
          <p style="margin:0 0 12px;font-size:13px;color:#555;">${(selectedOfferForTest.description || "").replace(/\n/g, "<br/>")}</p>
          ${selectedOfferForTest.discount_percent ? `<p style="margin:0 0 12px;font-size:13px;color:#555;">Discount: <strong>${selectedOfferForTest.discount_percent}% off</strong></p>` : ""}
          <p style="margin:0 0 12px;font-size:13px;color:#555;">Offer code: <strong style="font-family:monospace;background:#fff;border:1px solid #fe8a24;padding:2px 8px;border-radius:4px;">${selectedOfferForTest.offer_id}</strong></p>
          <a href="${testOfferLink}" style="display:inline-block;background:#fe8a24;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">Book Your Next Visit</a>
        </div>` : "";

      const surveyHtml = settings.surveyEnabled ? `
        <div style="margin-top:24px;padding:20px;background:#fffbf5;border:1px solid #fde3c0;border-radius:12px;text-align:center;">
          <a href="https://dashboard.dinery.ai/feedback/PREVIEW" style="text-decoration:none;display:block;">
            <p style="margin:0 0 10px;font-size:14px;font-weight:bold;color:#1e293b;">⭐ Rate Your Experience</p>
            <p style="margin:0 0 10px;font-size:28px;letter-spacing:4px;line-height:1;">⭐⭐⭐⭐⭐</p>
            <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">It only takes 10 seconds, but it will help us a lot. ❤️</p>
            <p style="margin:6px 0 0;font-size:12px;color:#fe8a24;font-weight:bold;">Click the stars to rate your visit →</p>
          </a>
        </div>` : "";

      const payload = {
        to: testEmail.trim(),
        subject: `[TEST PREVIEW] Thank you for visiting ${restaurantName}!`,
        isReservation: true,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b;">
          <div style="background:#fff3e8;border:2px solid #fe8a24;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#c05a00;font-weight:600;">
            ⚠️ TEST PREVIEW — this is what your guests will receive. Links are placeholders.
          </div>
          <h2 style="color:#fe8a24;margin-bottom:4px;">Thank you for visiting!</h2>
          <p style="font-size:14px;line-height:1.6;">${thankYouHtml}</p>
          ${offerHtml}
          ${surveyHtml}
        </div>`,
      };

      console.log("📧 Calling sendEmail with payload:", { to: payload.to, subject: payload.subject });

      const result = await sendEmailFn(payload);
      const data = result.data;

      console.log("📧 sendEmail response:", data);

      if (data?.success === false) {
        setTestResult({
          ok: false,
          message: `Function ran but Resend rejected the email: ${data.error || data.message || "Unknown Resend error"}. Check that RESEND_API_KEY is bound to sendEmail in Firebase.`,
        });
      } else if (data?.id?.startsWith("simulated-")) {
        setTestResult({
          ok: false,
          message: `Function ran but RESEND_API_KEY is not set — email was simulated, not actually sent. Go to Firebase Console → Functions → sendEmail → Secrets and bind RESEND_API_KEY.`,
        });
      } else {
        setTestResult({
          ok: true,
          message: `Email sent! Resend ID: ${data?.id || "—"}. Check ${testEmail.trim()} — also check your spam folder.`,
        });
      }
    } catch (e) {
      console.error("sendTestEmail error:", e);
      const msg = e?.message || "Unknown error";
      const isAuth = msg.toLowerCase().includes("unauthenticated");
      setTestResult({
        ok: false,
        message: isAuth
          ? "Auth error: the sendEmail function rejected the call. Make sure you are logged in and the isReservation flag is set — check sendEmail.js line that reads isReservationEmail."
          : `Error calling sendEmail: ${msg}`,
      });
    } finally {
      setTestSending(false);
    }
  };

  const runChecklist = async () => {
    setChecklistLoading(true);
    setChecklist(null);
    try {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, "0");
      const hourMatch = currentHour === String(settings.sendHour).padStart(2, "0");
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayStart = new Date(yesterday); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(yesterday); dayEnd.setHours(23,59,59,999);
      let sampleReservation = null;
      let alreadySent = false;
      let hasEmail = false;
      let goodStatus = false;
      try {
        const { Timestamp } = await import("firebase/firestore");
        const resQ = query(collection(firestore, "reservations"), where("restaurant_id", "==", restaurantId), where("reservation_date", ">=", Timestamp.fromDate(dayStart)), where("reservation_date", "<=", Timestamp.fromDate(dayEnd)), limit(10));
        const snap = await getDocs(resQ);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        sampleReservation = all[0] || null;
        if (sampleReservation) {
          hasEmail = !!sampleReservation.customer_email?.trim();
          goodStatus = ["confirmed", "completed"].includes(sampleReservation.status);
          alreadySent = sampleReservation.thankYouEmailSent === true;
        }
      } catch (_) {}
      let indexOk = true;
      let indexLink = "";
      try {
        await getDocs(query(collection(firestore, "reservations"), where("restaurant_id", "==", restaurantId), where("thankYouEmailSent", "==", true), orderBy("thankYouEmailSentAt", "desc"), limit(1)));
      } catch (indexErr) {
        indexOk = false;
        console.error("🔴 Firestore index missing — create it here:", indexErr.message || indexErr);
        const urlMatch = (indexErr.message || "").match(/https:\/\/console\.firebase\.google\.com[^\s"']*/);
        if (urlMatch) indexLink = urlMatch[0];
      }
      setChecklist({
        items: [
          { label: t('emailAutomationEnabled'), ok: settings.enabled, detail: settings.enabled ? t('enabledInSettings') : t('turnOnFirst') },
          { label: t('sendHourMatches'), ok: hourMatch, detail: hourMatch ? t('bothSetTo').replace('{hour}', `${currentHour}:00 ✓`) : t('configuredVsCurrent').replace('{config}', settings.sendHour).replace('{current}', currentHour).replace('{suggest}', `${currentHour}:00 — ${parseInt(currentHour) < 12 ? currentHour + ":00 AM" : parseInt(currentHour) === 12 ? "12:00 PM" : (parseInt(currentHour)-12).toString().padStart(2,"0")+":00 PM"}`) },
          { label: t('crmSettingsSaved'), ok: true, detail: t('settingsDocFound') },
          { label: t('yesterdayReservationsFound'), ok: !!sampleReservation, detail: sampleReservation ? t('foundReservation').replace('{name}', sampleReservation.customer_name || sampleReservation.id) : t('noReservationsYesterday') },
          { label: t('reservationHasEmail'), ok: hasEmail, detail: hasEmail ? sampleReservation.customer_email : t('noEmail') },
          { label: t('statusConfirmedOrCompleted'), ok: goodStatus, detail: goodStatus ? t('statusIs').replace('{status}', sampleReservation.status) : t('changeToConfirmed').replace('{status}', sampleReservation?.status || "unknown") },
          { label: t('emailNotAlreadySent'), ok: !alreadySent, detail: alreadySent ? t('alreadySent') : t('notYetSent') },
          { label: t('firestoreIndexExists'), ok: indexOk, detail: indexOk ? t('indexExists') : indexLink ? t('indexMissing') : t('indexMissing') + " " + t('openFirestoreIndexes'), indexLink },
        ],
        checkedAt: new Date(),
      });
    } catch (e) {
      console.error("Checklist error:", e);
    } finally {
      setChecklistLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fe8a24]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('emailAutomation')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('configureWorkflow')}</p>
        </div>
        {activePanel === "settings" && (
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#fe8a24] text-white text-sm font-semibold rounded-lg hover:bg-[#e07a1f] transition-colors disabled:opacity-60 shadow-sm">
            {saving ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> {t('saving')}</> : saved ? <>✓ {t('saved')}</> : t('saveSettings')}
          </button>
        )}
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          ["settings", t('settings'), "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"],
          ["log", t('emailLog'), "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"],
          ["test", t('test'), "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"],
        ].map(([key, label, path]) => (
          <button key={key} onClick={() => { setActivePanel(key); if (key === "test" && !checklist) runChecklist(); }} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activePanel === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} /></svg>
            {label}
          </button>
        ))}
      </div>
      {activePanel === "settings" && (
        <div>
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 border ${settings.enabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${settings.enabled ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${settings.enabled ? "text-green-800" : "text-gray-600"}`}>
                {settings.enabled 
                  ? t('automationActive').replace('{time}', `${settings.sendHour}:00 (${parseInt(settings.sendHour) < 12 ? settings.sendHour + ":00 AM" : settings.sendHour === "12" ? "12:00 PM" : (parseInt(settings.sendHour) - 12).toString().padStart(2,"0") + ":00 PM"})`)
                  : t('automationOff')}
              </p>
              <p className={`text-xs mt-0.5 ${settings.enabled ? "text-green-600" : "text-gray-400"}`}>
                {settings.enabled 
                  ? `${settings.offerEnabled ? t('offerEnabled') : t('offerDisabled')} · ${settings.surveyEnabled ? t('surveyEnabled') : t('surveyDisabled')} · ${t('reviewThreshold').replace('{threshold}', settings.reviewThreshold)}`
                  : t('enableBelow')}
              </p>
            </div>
            <Toggle enabled={settings.enabled} onChange={(v) => set("enabled", v)} />
          </div>
          <SectionCard title={t('sendTime')} subtitle={t('whenEmailSent')}>
            <select value={settings.sendHour} onChange={(e) => set("sendHour", e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
              {Array.from({ length: 24 }, (_, i) => {
                const val = String(i).padStart(2, "0");
                const h12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
                const ampm = i < 12 ? "AM" : "PM";
                return <option key={val} value={val}>{val}:00 — {h12}:00 {ampm}</option>;
              })}
            </select>
            <p className="text-xs text-gray-400 mt-2">Only sent for <span className="font-mono bg-gray-100 px-1 rounded">confirmed</span> or <span className="font-mono bg-gray-100 px-1 rounded">completed</span> reservations. Each reservation receives only one email.</p>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-xs text-amber-700"><span className="font-semibold">{t('testingTip')}</span></p></div>
          </SectionCard>
          <SectionCard title={t('thankYouMessage')} subtitle={t('openingMessage')}>
            <textarea value={settings.thankYouMessage} onChange={(e) => set("thankYouMessage", e.target.value)} rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24] resize-none" />
            <div className="mt-3 flex flex-wrap gap-2">
              {["{{restaurant_name}}","{{customer_first_name}}","{{customer_full_name}}","{{reservation_date}}","{{reservation_time}}","{{party_size}}"].map((tag) => (
                <span key={tag} className="text-xs bg-orange-50 text-[#fe8a24] border border-orange-200 rounded px-2 py-1 font-mono cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => set("thankYouMessage", settings.thankYouMessage + " " + tag)}>{tag}</span>
              ))}
            </div>
          </SectionCard>
          <SectionCard title={t('returnVisitOffer')} subtitle={t('attachExistingOffer')} action={<Toggle enabled={settings.offerEnabled} onChange={(v) => set("offerEnabled", v)} />}>
            {settings.offerEnabled ? (
              loadingOffers ? (
                <p className="text-sm text-gray-400">{t('loadingOffers')}</p>
              ) : restaurantOffers.length === 0 ? (
                <p className="text-sm text-gray-400">{t('noOffersYet')}</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectOffer')}</label>
                    <select value={settings.selectedOfferId} onChange={(e) => set("selectedOfferId", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
                      <option value="">— {t('selectOffer')} —</option>
                      {restaurantOffers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.offer_id}: {o.offer_name}{o.discount_percent ? ` (${o.discount_percent}% off)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {settings.selectedOfferId && (() => {
                    const selected = restaurantOffers.find((o) => o.id === settings.selectedOfferId);
                    if (!selected) return null;
                    return (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-xs text-gray-600">
                        <p className="font-semibold text-[#fe8a24] mb-1">{selected.offer_name} — code {selected.offer_id}</p>
                        <p>{selected.description}</p>
                        <p className="mt-2 text-gray-500">
                          Usage: {selected.usage_limit_type === "unlimited" ? "Unlimited" : selected.usage_limit_type === "max_uses" ? `Max ${selected.max_uses} total uses` : "One use per guest"}
                        </p>
                      </div>
                    );
                  })()}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4"><p className="text-xs text-[#fe8a24] font-semibold mb-1">{t('howOfferLinkWorks')}</p><p className="text-xs text-gray-600">{t('offerLinkDescription')}</p></div>
                </div>
              )
            ) : <p className="text-sm text-gray-400">Enable to attach a return visit offer to this email.</p>}
          </SectionCard>
          <SectionCard title={t('campaignRevenueTracking')} subtitle={t('usedToEstimateRevenue')}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('averageRevenuePerGuest')}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={settings.avgRevenuePerGuest}
              onChange={(e) => set("avgRevenuePerGuest", e.target.value)}
              placeholder="e.g. 450"
              className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
            />
            <p className="text-xs text-gray-400 mt-2">{t('averageAmountSpent')}</p>
          </SectionCard>
          <SectionCard title={t('feedbackSurvey')} subtitle={t('collectStarRatings')} action={<Toggle enabled={settings.surveyEnabled} onChange={(v) => set("surveyEnabled", v)} />}>
            {settings.surveyEnabled ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">{t('chooseQuestions')}</p>
                {[{key:"food",label:t('foodQuality')},{key:"service",label:t('serviceLabel')},{key:"atmosphere",label:t('atmosphereLabel')},{key:"overall",label:t('overallExperience')},{key:"comments",label:t('additionalComments')}].map(({key,label}) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{label}</span>
                    <Toggle enabled={settings.surveyQuestions[key]} onChange={(v) => setSurveyQ(key, v)} />
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">{t('enableToCollectFeedback')}</p>}
          </SectionCard>
          <SectionCard title={t('publicReviewFunnelSettings')} subtitle={t('promptSatisfiedGuests')}>
            <div className="space-y-5">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('suggestReviewIfAbove')}</label>
                <select value={settings.reviewThreshold} onChange={(e) => set("reviewThreshold", e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
                  <option value="4.0">4.0 {t('andAbove')}</option><option value="4.5">4.5 {t('andAbove')}</option><option value="5.0">5.0 {t('only')}</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('googleReviewUrl')}</label><input type="url" value={settings.googleReviewUrl} onChange={(e) => set("googleReviewUrl", e.target.value)} placeholder="https://g.page/r/YOUR_PLACE_ID/review" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">{t('tripAdvisorUrl')}</label><input type="url" value={settings.tripAdvisorUrl} onChange={(e) => set("tripAdvisorUrl", e.target.value)} placeholder="https://www.tripadvisor.com/UserReview-..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" /></div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-xs text-blue-700 font-semibold mb-1">{t('howReviewFunnelWorks')}</p><p className="text-xs text-gray-600">{t('reviewFunnelDescription')}</p></div>
            </div>
          </SectionCard>
        </div>
      )}
      {activePanel === "log" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">{t('sentEmailLog')}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('reservationsReceivedEmail')}</p>
          </div>
          <div className="px-6 py-5"><EmailLog restaurantId={restaurantId} /></div>
        </div>
      )}

      {activePanel === "test" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{t('sendPreviewEmail')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('sendRealEmail')}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={t('yourEmail')}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
                  onKeyDown={(e) => e.key === "Enter" && sendTestEmail()}
                />
                <button
                  onClick={sendTestEmail}
                  disabled={testSending || !testEmail.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#fe8a24] text-white text-sm font-semibold rounded-lg hover:bg-[#e07a1f] transition-colors disabled:opacity-50"
                >
                  {testSending ? (
                    <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> {t('sending')}</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> {t('sendPreview')}</>
                  )}
                </button>
              </div>
              {testResult && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${testResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                  <span className="text-base flex-shrink-0">{testResult.ok ? "✓" : "✗"}</span>
                  <span>{testResult.message}</span>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500">
                <p className="font-semibold text-gray-600 mb-1">{t('whatThisSends')}</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>{t('yourThankYouMessage')}</li>
                  {settings.offerEnabled && settings.selectedOfferId && <li>{t('returnVisitOfferLabel')} — <span className="font-mono">{restaurantOffers.find((o) => o.id === settings.selectedOfferId)?.offer_id || "the selected offer"}</span></li>}
                  {settings.surveyEnabled && <li>{t('feedbackSurveyLabel')}</li>}
                  <li>{t('testWarningBanner')}</li>
                </ul>
                <p className="mt-2">{t('previewNote')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">{t('preFlightChecklist')}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{t('checksEveryCondition')}</p>
              </div>
              <button
                onClick={runChecklist}
                disabled={checklistLoading}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#fe8a24] border border-gray-200 hover:border-[#fe8a24] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${checklistLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {checklistLoading ? t('checking') : t('reRun')}
              </button>
            </div>
            <div className="px-6 py-5">
              {checklistLoading && (
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#fe8a24]" />
                  {t('runningChecks')}
                </div>
              )}
              {checklist && !checklistLoading && (
                <div className="space-y-2">
                  {checklist.items.map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${item.ok ? "bg-green-50 border-green-100" : "bg-red-50 border-red-200"}`}>
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5 ${item.ok ? "bg-green-500" : "bg-red-500"}`}>
                        {item.ok ? "✓" : "✗"}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${item.ok ? "text-green-900" : "text-red-900"}`}>{item.label}</p>
                        <p className={`text-xs mt-0.5 ${item.ok ? "text-green-600" : "text-red-700"}`}>{item.detail}</p>
                        {!item.ok && item.indexLink && (
                          <a href={item.indexLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            {t('createIndexInFirebase')}
                          </a>
                        )}
                        {!item.ok && !item.indexLink && item.label === t('firestoreIndexExists') && (
                          <a href={`https://console.firebase.google.com/project/dinery-9c261/firestore/indexes`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-red-600 border border-red-300 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            {t('openFirestoreIndexes')}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>{t('checkedAt').replace('{time}', checklist.checkedAt.toLocaleTimeString())}</span>
                    <span className={`font-semibold ${checklist.items.every(i => i.ok) ? "text-green-600" : "text-red-500"}`}>
                      {checklist.items.filter(i => i.ok).length}/{checklist.items.length} {t('passed')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">{t('manuallyTrigger')}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{t('forcesFunction')}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-900 rounded-lg px-4 py-3 font-mono text-sm text-green-400 overflow-x-auto">
                <p className="text-gray-500 text-xs mb-2">{t('step1FindJob')}</p>
                <p>gcloud scheduler jobs list --project=YOUR_PROJECT_ID</p>
                <p className="text-gray-500 text-xs mt-3 mb-2">{t('step2Trigger')}</p>
                <p>gcloud scheduler jobs run \</p>
                <p className="pl-4">firebase-schedule-sendThankYouEmails-asia-southeast1 \</p>
                <p className="pl-4">--project=YOUR_PROJECT_ID \</p>
                <p className="pl-4">--location=asia-southeast1</p>
                <p className="text-gray-500 text-xs mt-3 mb-2">{t('step3WatchLogs')}</p>
                <p>firebase functions:log --only sendThankYouEmails</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {[
                  { icon: "🕐", title: t('hourMustMatch'), desc: t('currentHour').replace('{hour}', String(new Date().getHours()).padStart(2,"0")) },
                  { icon: "📅", title: t('dateMustBeYesterday'), desc: t('functionLooksForYesterday') },
                  { icon: "📧", title: t('checkLogsForErrors'), desc: t('lookForErrors') },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-lg mb-1">{icon}</p>
                    <p className="font-semibold text-gray-700 mb-1">{title}</p>
                    <p className="text-gray-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feedback Detail Modal ────────────────────────────────────────────────────

function FeedbackDetailModal({ feedback, onClose }) {
  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  
  const t = (key) => {
    return (i18n[lang] && i18n[lang][key]) || (i18n.en && i18n.en[key]) || key;
  };

  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  const [reservation, setReservation] = useState(null);
  const [loadingRes, setLoadingRes] = useState(false);

  useEffect(() => {
    if (!feedback?.reservationId) return;
    setLoadingRes(true);
    getDoc(doc(firestore, "reservations", feedback.reservationId))
      .then((snap) => { if (snap.exists()) setReservation({ id: snap.id, ...snap.data() }); })
      .catch(console.error)
      .finally(() => setLoadingRes(false));
  }, [feedback?.reservationId]);

  if (!feedback) return null;

  const avg = (((feedback.foodRating || 0) + (feedback.serviceRating || 0) + (feedback.atmosphereRating || 0) + (feedback.overallRating || 0)) / 4).toFixed(1);
  const isPositive = parseFloat(avg) >= 4;
  const submittedAt = feedback.createdAt?.toDate ? feedback.createdAt.toDate() : null;

  const visitDate = reservation?.reservation_date?.toDate?.() || (reservation?.reservation_date ? new Date(reservation.reservation_date) : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t('feedbackDetail')}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{submittedAt ? submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{feedback.email || t('anonymousGuest')}</p>
                {reservation && <p className="text-xs text-gray-400 mt-0.5">{reservation.customer_name}{reservation.number_of_guests ? ` · ${reservation.number_of_guests} ${t('guests')}` : ""}</p>}
              </div>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${isPositive ? "bg-green-100 text-green-700" : parseFloat(avg) >= 3 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                {avg} ★ avg
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[{label:t('foodQuality'),val:feedback.foodRating},{label:t('serviceLabel'),val:feedback.serviceRating},{label:t('atmosphereLabel'),val:feedback.atmosphereRating},{label:t('overallExperience'),val:feedback.overallRating}].map(({label,val}) => val !== null && (
                <div key={label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-2">{label}</p>
                  <StarRating value={val} size="lg" />
                  <p className="text-sm font-bold text-gray-700 mt-1">{val} / 5</p>
                </div>
              ))}
            </div>

            {feedback.comments && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('comments')}</p>
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#fe8a24]">
                  <p className="text-sm text-gray-700 leading-relaxed italic">"{feedback.comments}"</p>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('linkedReservation')}</p>
              {loadingRes ? (
                <div className="flex items-center gap-2 text-xs text-gray-400"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300" /> Loading…</div>
              ) : reservation ? (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('visitDate')}</span>
                    <span className="font-medium text-gray-700">{visitDate ? visitDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('time')}</span>
                    <span className="font-medium text-gray-700">{reservation.from_time || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('partySize')}</span>
                    <span className="font-medium text-gray-700">{reservation.number_of_guests ? `${reservation.number_of_guests} ${t('guests')}` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('table')}</span>
                    <span className="font-medium text-gray-700">{reservation.table_name || reservation.combination_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('status')}</span>
                    <span className={`font-medium capitalize ${reservation.status === "completed" ? "text-blue-600" : reservation.status === "confirmed" ? "text-green-600" : "text-gray-500"}`}>{reservation.status}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Reservation not found or was deleted.</p>
              )}
            </div>

            {feedback.reservationId && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('surveyLink')}</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
                  <span className="text-xs text-gray-500 font-mono truncate flex-1">/feedback/{feedback.reservationId}</span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/feedback/${feedback.reservationId}`); }}
                    className="text-xs text-[#fe8a24] font-semibold hover:underline flex-shrink-0"
                  >
                    {t('copy')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Guest Feedback ───────────────────────────────────────────────────────────

function exportToCSV(feedbacks) {
  const headers = ["Email","Food","Service","Atmosphere","Overall","Average","Comments","Submitted"];
  const rows = feedbacks.map((fb) => {
    const avg = (((fb.foodRating || 0) + (fb.serviceRating || 0) + (fb.atmosphereRating || 0) + (fb.overallRating || 0)) / 4).toFixed(1);
    const date = fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleDateString("en-GB") : "";
    return [fb.email || "", fb.foodRating || "", fb.serviceRating || "", fb.atmosphereRating || "", fb.overallRating || "", avg, `"${(fb.comments || "").replace(/"/g, '""')}"`, date];
  });
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `feedback-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function RatingBar({ label, value, max = 5 }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = value >= 4 ? "bg-emerald-500" : value >= 3 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value > 0 ? value : "—"}</span>
    </div>
  );
}

function GuestFeedback({ restaurantId }) {
  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  
  const t = (key) => {
    return (i18n[lang] && i18n[lang][key]) || (i18n.en && i18n.en[key]) || key;
  };

  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [sortDir, setSortDir] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [activeView, setActiveView] = useState("list");

  const load = useCallback(async (isManualRefresh = false) => {
    if (!restaurantId) return;
    if (isManualRefresh) setRefreshing(true); else setLoading(true);
    try {
      const snap = await getDocs(query(collection(firestore, "feedback"), where("restaurantId", "==", restaurantId), orderBy("createdAt", "desc")));
      setFeedbacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Load feedback error:", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [restaurantId]);

  useEffect(() => { load(false); }, [load]);

  const avgRating = (fb) => ((fb.foodRating || 0) + (fb.serviceRating || 0) + (fb.atmosphereRating || 0) + (fb.overallRating || 0)) / 4;
  const avgOf = (field) => feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + (f[field] || 0), 0) / feedbacks.length).toFixed(1) : "—";

  const filtered = feedbacks.filter((fb) => {
    if (search && !fb.comments?.toLowerCase().includes(search.toLowerCase()) && !fb.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRating !== "all") {
      const avg = avgRating(fb);
      if (filterRating === "positive" && avg < 4) return false;
      if (filterRating === "neutral" && (avg < 3 || avg >= 4)) return false;
      if (filterRating === "negative" && avg >= 3) return false;
    }
    if (dateFrom) {
      const fbDate = fb.createdAt?.toDate?.() || new Date(0);
      if (fbDate < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const fbDate = fb.createdAt?.toDate?.() || new Date(0);
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      if (fbDate > end) return false;
    }
    return true;
  }).sort((a, b) => {
    const tA = a.createdAt?.toDate?.() || new Date(0);
    const tB = b.createdAt?.toDate?.() || new Date(0);
    return sortDir === "desc" ? tB - tA : tA - tB;
  });

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: feedbacks.filter((fb) => Math.round(((fb.foodRating || 0) + (fb.serviceRating || 0) + (fb.atmosphereRating || 0) + (fb.overallRating || 0)) / 4) === star).length,
  }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fe8a24]" /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('guestFeedback')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('responsesCollected')}</p>
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <button onClick={() => exportToCSV(filtered)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#fe8a24] border border-gray-200 hover:border-[#fe8a24] rounded-lg px-3 py-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {t('exportCSV')}
            </button>
          )}
          <RefreshButton onClick={() => load(true)} refreshing={refreshing} t={t} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard label={t('totalResponses')} value={feedbacks.length} color="orange" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <MetricCard label={t('avgFood')} value={avgOf("foodRating")} color="orange" sub={t('outOf5')} icon="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        <MetricCard label={t('avgService')} value={avgOf("serviceRating")} color="blue" sub={t('outOf5')} icon="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        <MetricCard label={t('avgAtmosphere')} value={avgOf("atmosphereRating")} color="purple" sub={t('outOf5')} icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        <MetricCard label={t('avgOverall')} value={avgOf("overallRating")} color="green" sub={t('outOf5')} icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[["list", t('listView')],["summary", t('summary')]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveView(key)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeView === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{label}</button>
        ))}
      </div>

      {activeView === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('averageByCategory')}</h3>
            <div className="space-y-3">
              <RatingBar label={t('foodQuality')} value={parseFloat(avgOf("foodRating")) || 0} />
              <RatingBar label={t('serviceLabel')} value={parseFloat(avgOf("serviceRating")) || 0} />
              <RatingBar label={t('atmosphereLabel')} value={parseFloat(avgOf("atmosphereRating")) || 0} />
              <RatingBar label={t('overallExperience')} value={parseFloat(avgOf("overallRating")) || 0} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('ratingDistribution')}</h3>
            <div className="space-y-2">
              {distribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-6 flex-shrink-0">{star}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-[#fe8a24] h-2 rounded-full transition-all" style={{ width: feedbacks.length > 0 ? `${(count / feedbacks.length) * 100}%` : "0%" }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
              <span className="text-emerald-600 font-semibold">{distribution.filter(d => d.star >= 4).reduce((s, d) => s + d.count, 0)} {t('positive')}</span>
              <span className="text-amber-600 font-semibold">{distribution.filter(d => d.star === 3).reduce((s, d) => s + d.count, 0)} {t('neutral')}</span>
              <span className="text-rose-500 font-semibold">{distribution.filter(d => d.star <= 2).reduce((s, d) => s + d.count, 0)} {t('negative')}</span>
            </div>
          </div>
        </div>
      )}

      {activeView === "list" && (
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder={t('searchByEmailOrComment')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 border border-gray-300 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
            </div>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
              <option value="all">{t('allRatings')}</option>
              <option value="positive">{t('positive4')}</option>
              <option value="neutral">{t('neutral3')}</option>
              <option value="negative">{t('negativeBelow3')}</option>
            </select>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
              <option value="desc">{t('newestFirst')}</option>
              <option value="asc">{t('oldestFirst')}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-gray-400 font-medium">{t('dateRange')}</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
            <span className="text-xs text-gray-400">{t('to')}</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">{t('clearDates')}</button>
            )}
            {filtered.length !== feedbacks.length && (
              <span className="text-xs text-[#fe8a24] font-medium">{t('shownOf').replace('{filtered}', filtered.length).replace('{total}', feedbacks.length)}</span>
            )}
          </div>
        </div>
      )}

      {activeView === "list" && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          {feedbacks.length === 0 ? (
            <>
              <p className="text-gray-500 text-base font-semibold mb-1">{t('noFeedbackCollected')}</p>
              <p className="text-gray-400 text-sm">{t('guestResponsesAppear')}</p>
              <p className="text-gray-300 text-xs mt-2">To test, visit <span className="font-mono">/feedback/&lt;reservationId&gt;</span> directly in your browser.</p>
            </>
          ) : (
            <p className="text-gray-400 text-sm">{t('noFeedbackMatches')}</p>
          )}
        </div>
      )}

      {activeView === "list" && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((fb) => {
            const avg = avgRating(fb).toFixed(1);
            const isPositive = parseFloat(avg) >= 4;
            const submittedAt = fb.createdAt?.toDate ? fb.createdAt.toDate() : null;
            return (
              <div
                key={fb.id}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:border-[#fe8a24]/30 hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => setSelectedFeedback(fb)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPositive ? "bg-emerald-100" : "bg-gray-100"}`}>
                      <span className={`text-sm font-bold ${isPositive ? "text-emerald-600" : "text-gray-500"}`}>
                        {(fb.email || "G").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{fb.email || t('anonymousGuest')}</p>
                      <p className="text-xs text-gray-400">{submittedAt ? submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isPositive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : parseFloat(avg) >= 3 ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                      {avg} ★
                    </span>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-[#fe8a24] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mb-2">
                  {[["Food", fb.foodRating], ["Service", fb.serviceRating], ["Atmosphere", fb.atmosphereRating], ["Overall", fb.overallRating]].map(([label, val]) => val !== null && val !== undefined && (
                    <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="font-medium">{label}</span> <StarRating value={val} />
                    </span>
                  ))}
                </div>
                {fb.comments && (
                  <p className="text-sm text-gray-500 italic line-clamp-2 mt-1 bg-gray-50/50 rounded-lg px-4 py-2 border border-gray-50">"{fb.comments}"</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedFeedback && (
        <FeedbackDetailModal feedback={selectedFeedback} onClose={() => setSelectedFeedback(null)} />
      )}
    </div>
  );
}

// ─── NAV TABS ─────────────────────────────────────────────────────────────────

const NAV_TABS = [
  { key: "overview", label: "Overview", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  { key: "email-settings", label: "Email Automation", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  { key: "campaigns", label: "Campaigns", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
  { key: "feedback", label: "Guest Feedback", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> },
];

// ─── Main CRM Shell ───────────────────────────────────────────────────────────

export default function CRM() {
  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  
  const t = (key) => {
    return (i18n[lang] && i18n[lang][key]) || (i18n.en && i18n.en[key]) || key;
  };

  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  const [activeTab, setActiveTab] = useState("overview");
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    async function resolveRestaurants() {
      setLoading(true);
      try {
        const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
        if (staffRestaurantId) {
          setIsStaff(true);
          const staffCollection = sessionStorage.getItem("staffCollection") || "restaurants";
          const snap = await getDoc(doc(firestore, staffCollection, staffRestaurantId));
          if (snap.exists()) { const r = { id: snap.id, ...snap.data() }; setRestaurants([r]); setSelectedRestaurant(r); }
          setLoading(false); return;
        }
        const currentUser = auth.currentUser;
        if (!currentUser) { setLoading(false); return; }
        let role = "owner";
        try { const us = await getDoc(doc(firestore, "users", currentUser.uid)); if (us.exists()) role = (us.data().role || "owner").toLowerCase(); } catch (_) {}
        const col1 = role === "tester" ? "TestRestaurant" : "restaurants";
        const col2 = role === "tester" ? null : "TestRestaurant";
        const snap1 = await getDocs(query(collection(firestore, col1), where("Owner_ID", "==", currentUser.uid)));
        let all = snap1.docs.map((d) => ({ id: d.id, ...d.data(), _collection: col1 }));
        if (col2) { try { const snap2 = await getDocs(query(collection(firestore, col2), where("Owner_ID", "==", currentUser.uid))); all = [...all, ...snap2.docs.map((d) => ({ id: d.id, ...d.data(), _collection: col2 }))]; } catch (_) {} }
        setRestaurants(all);
        if (all.length > 0) setSelectedRestaurant(all[0]);
      } catch (e) { console.error("CRM restaurant resolve error:", e); }
      finally { setLoading(false); }
    }
    resolveRestaurants();
  }, []);

  const handleRestaurantChange = (id) => { const found = restaurants.find((r) => r.id === id); if (found) setSelectedRestaurant(found); };

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
      <div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fe8a24] mx-auto mb-3" /><p className="text-sm text-gray-400">{t('loading')}</p></div>
    </div>
  );

  if (!selectedRestaurant) return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-[#fe8a24]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
        <p className="text-gray-700 text-base font-semibold">{t('noRestaurantFound')}</p>
        <p className="text-gray-400 text-sm mt-1">{t('pleaseAddRestaurant')}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-[#fe8a24] to-orange-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div><h1 className="text-lg font-bold text-gray-900 leading-tight">{t('crm')}</h1><p className="text-xs text-gray-400 font-medium">{t('customerRelationshipManagement')}</p></div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {restaurants.length > 1 && !isStaff ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
                <select value={selectedRestaurant.id} onChange={(e) => handleRestaurantChange(e.target.value)} className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#fe8a24] appearance-none cursor-pointer hover:border-[#fe8a24] transition-colors">
                  {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl px-4 py-2">
                <svg className="w-4 h-4 text-[#fe8a24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <span className="text-sm font-semibold text-[#fe8a24]">{selectedRestaurant.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 flex gap-1 pb-0">
          {NAV_TABS.map((tab) => {
            const label = t(tab.key === "overview" ? "overview" : tab.key === "email-settings" ? "emailAutomation" : tab.key === "campaigns" ? "campaigns" : "guestFeedback");
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${activeTab === tab.key ? "border-[#fe8a24] text-[#fe8a24]" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"}`}>
                {tab.icon}{label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === "overview" && <CRMOverview restaurantId={selectedRestaurant.id} />}
          {activeTab === "email-settings" && <EmailAutomation restaurantId={selectedRestaurant.id} collectionName={selectedRestaurant._collection || "restaurants"} />}
          {activeTab === "campaigns" && <Campaigns restaurantId={selectedRestaurant.id} collectionName={selectedRestaurant._collection || "restaurants"} />}
          {activeTab === "feedback" && <GuestFeedback restaurantId={selectedRestaurant.id} />}
        </div>
      </div>    
    </div>
  );
}