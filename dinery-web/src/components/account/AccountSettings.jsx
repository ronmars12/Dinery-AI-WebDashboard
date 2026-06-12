import React, { useState, useEffect } from "react";
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, onSnapshot } from "firebase/firestore";
import { Check, X, Eye, BarChart3, Clock, LineChart, Bell, Award, Headphones, UserCheck, Video, Crown, Star, TrendingUp } from 'lucide-react';

export default function AccountSettings({ isSidebarMinimized = false }) {
  const auth = getAuth();
  const firestore = getFirestore();

  const user = auth.currentUser;
  const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
  const staffRole         = sessionStorage.getItem("staffRole");
  const isStaff           = !!staffRestaurantId;
  // Helper function to get environment variables (works with both Vite and CRA)
  const getEnvVar = (key) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return '';
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const [currentPlan, setCurrentPlan] = useState('starter');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');

  const I18N = {
    en: {
      personalInformation: 'Personal Information',
      contactInformation: 'Contact Information',
      displayName: 'Display Name',
      firstName: 'First Name',
      lastName: 'Last Name',
      middleName: 'Middle Name',
      optional: '(Optional)',
      emailAddress: 'Email Address',
      contactNumber: 'Contact Number',
      socialMediaProfile: 'Social Media Profile',
      edit: 'Edit',
      cancel: 'Cancel',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      userProfile: 'User Profile',
      loadingProfile: 'Loading your profile...',
      secureInfo: 'Your information is secure and protected',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      updatePassword: 'Update Password',
      updatingPassword: 'Updating...',
      passwordMismatch: 'New passwords do not match.',
      passwordTooShort: 'Password should be at least 6 characters.',
      passwordUpdated: 'Password updated successfully.',
      passwordError: 'Failed to update password:',
      accountSettings: 'Account Settings',
      manageProfile: 'Manage your profile and subscription plan',
      yourSubscription: 'Your Subscription',
      choosePlan: 'Choose Your Plan',
      upgradeAnytime: 'Upgrade anytime to unlock more features',
      currentPlan: 'Current Plan',
      upgradeTo: 'Upgrade to',
      needHelp: 'Need help?',
      monthly: '/mo',
      active: 'Active',
      plan: 'Plan',
      upgrading: 'Processing...',
      manageBilling: 'Manage Billing'
    },
    fi: {
      personalInformation: 'Henkilötiedot',
      contactInformation: 'Yhteystiedot',
      displayName: 'Näyttönimi',
      firstName: 'Etunimi',
      lastName: 'Sukunimi',
      middleName: 'Toinen nimi',
      optional: '(Valinnainen)',
      emailAddress: 'Sähköpostiosoite',
      contactNumber: 'Puhelinnumero',
      socialMediaProfile: 'Sosiaalinen profiili',
      edit: 'Muokkaa',
      cancel: 'Peruuta',
      saveChanges: 'Tallenna muutokset',
      saving: 'Tallennetaan...',
      userProfile: 'Käyttäjäprofiili',
      loadingProfile: 'Ladataan profiilia...',
      secureInfo: 'Tietosi ovat turvassa ja suojattuja.',
      changePassword: 'Vaihda salasana',
      currentPassword: 'Nykyinen salasana',
      newPassword: 'Uusi salasana',
      confirmPassword: 'Vahvista salasana',
      updatePassword: 'Päivitä salasana',
      updatingPassword: 'Päivitetään...',
      passwordMismatch: 'Uudet salasanat eivät täsmää.',
      passwordTooShort: 'Salasanan tulee olla vähintään 6 merkkiä.',
      passwordUpdated: 'Salasana päivitetty onnistuneesti.',
      passwordError: 'Salasanan päivitys epäonnistui:',
      accountSettings: 'Tilin asetukset',
      manageProfile: 'Hallitse profiiliasi ja tilaussuunnitelmaasi',
      yourSubscription: 'Tilauksesi',
      choosePlan: 'Valitse suunnitelmasi',
      upgradeAnytime: 'Päivitä milloin tahansa saadaksesi lisää ominaisuuksia',
      currentPlan: 'Nykyinen suunnitelma',
      upgradeTo: 'Päivitä',
      needHelp: 'Tarvitsetko apua?',
      monthly: '/kk',
      active: 'Aktiivinen',
      plan: 'Suunnitelma',
      upgrading: 'Käsitellään...',
      manageBilling: 'Hallitse laskutusta'
    },
    no: {
      personalInformation: 'Personlig informasjon',
      contactInformation: 'Kontaktinformasjon',
      displayName: 'Visningsnavn',
      firstName: 'Fornavn',
      lastName: 'Etternavn',
      middleName: 'Mellomnavn',
      optional: '(Valgfritt)',
      emailAddress: 'E-postadresse',
      contactNumber: 'Telefonnummer',
      socialMediaProfile: 'Sosial profil',
      edit: 'Rediger',
      cancel: 'Avbryt',
      saveChanges: 'Lagre endringer',
      saving: 'Lagrer...',
      userProfile: 'Brukerprofil',
      loadingProfile: 'Laster profilen...',
      secureInfo: 'Informasjonen din er sikker og beskyttet.',
      changePassword: 'Endre passord',
      currentPassword: 'Nåværende passord',
      newPassword: 'Nytt passord',
      confirmPassword: 'Bekreft passord',
      updatePassword: 'Oppdater passord',
      updatingPassword: 'Oppdaterer...',
      passwordMismatch: 'Nye passordene stemmer ikke overens.',
      passwordTooShort: 'Passordet må være minst 6 tegn.',
      passwordUpdated: 'Passord oppdatert.',
      passwordError: 'Kunne ikke oppdatere passordet:',
      accountSettings: 'Kontoinnstillinger',
      manageProfile: 'Administrer profilen din og abonnementsplan',
      yourSubscription: 'Ditt abonnement',
      choosePlan: 'Velg din plan',
      upgradeAnytime: 'Oppgrader når som helst for å låse opp flere funksjoner',
      currentPlan: 'Nåværende plan',
      upgradeTo: 'Oppgrader til',
      needHelp: 'Trenger du hjelp?',
      monthly: '/md',
      active: 'Aktiv',
      plan: 'Plan',
      upgrading: 'Behandler...',
      manageBilling: 'Administrer fakturering'
    },
    sv: {
      personalInformation: 'Personlig information',
      contactInformation: 'Kontaktinformation',
      displayName: 'Visningsnamn',
      firstName: 'Förnamn',
      lastName: 'Efternamn',
      middleName: 'Mellannamn',
      optional: '(Valfritt)',
      emailAddress: 'E-postadress',
      contactNumber: 'Telefonnummer',
      socialMediaProfile: 'Social profil',
      edit: 'Redigera',
      cancel: 'Avbryt',
      saveChanges: 'Spara ändringar',
      saving: 'Sparar...',
      userProfile: 'Användarprofil',
      loadingProfile: 'Laddar profil...',
      secureInfo: 'Din information är säker och skyddad.',
      changePassword: 'Ändra lösenord',
      currentPassword: 'Nuvarande lösenord',
      newPassword: 'Nytt lösenord',
      confirmPassword: 'Bekräfta lösenord',
      updatePassword: 'Uppdatera lösenord',
      updatingPassword: 'Uppdaterar...',
      passwordMismatch: 'Nya lösenorden matchar inte.',
      passwordTooShort: 'Lösenordet måste vara minst 6 tecken.',
      passwordUpdated: 'Lösenord uppdaterat.',
      passwordError: 'Kunde inte uppdatera lösenordet:',
      accountSettings: 'Kontoinställningar',
      manageProfile: 'Hantera din profil och prenumerationsplan',
      yourSubscription: 'Din prenumeration',
      choosePlan: 'Välj din plan',
      upgradeAnytime: 'Uppgradera när som helst för att låsa upp fler funktioner',
      currentPlan: 'Nuvarande plan',
      upgradeTo: 'Uppgradera till',
      needHelp: 'Behöver du hjälp?',
      monthly: '/mån',
      active: 'Aktiv',
      plan: 'Plan',
      upgrading: 'Bearbetar...',
      manageBilling: 'Hantera fakturering'
    },
    de: {
      personalInformation: 'Persönliche Informationen',
      contactInformation: 'Kontaktinformationen',
      displayName: 'Anzeigename',
      firstName: 'Vorname',
      lastName: 'Nachname',
      middleName: 'Zweiter Vorname',
      optional: '(Optional)',
      emailAddress: 'E-Mail-Adresse',
      contactNumber: 'Telefonnummer',
      socialMediaProfile: 'Soziales Profil',
      edit: 'Bearbeiten',
      cancel: 'Abbrechen',
      saveChanges: 'Änderungen speichern',
      saving: 'Speichern...',
      userProfile: 'Benutzerprofil',
      loadingProfile: 'Profil wird geladen...',
      secureInfo: 'Ihre Informationen sind sicher und geschützt.',
      changePassword: 'Passwort ändern',
      currentPassword: 'Aktuelles Passwort',
      newPassword: 'Neues Passwort',
      confirmPassword: 'Passwort bestätigen',
      updatePassword: 'Passwort aktualisieren',
      updatingPassword: 'Aktualisiere...',
      passwordMismatch: 'Neue Passwörter stimmen nicht überein.',
      passwordTooShort: 'Passwort muss mindestens 6 Zeichen lang sein.',
      passwordUpdated: 'Passwort erfolgreich aktualisiert.',
      passwordError: 'Fehler beim Aktualisieren des Passworts:',
      accountSettings: 'Kontoeinstellungen',
      manageProfile: 'Verwalten Sie Ihr Profil und Ihren Abonnementplan',
      yourSubscription: 'Ihr Abonnement',
      choosePlan: 'Wählen Sie Ihren Plan',
      upgradeAnytime: 'Upgrade jederzeit möglich, um weitere Funktionen freizuschalten',
      currentPlan: 'Aktueller Plan',
      upgradeTo: 'Upgrade auf',
      needHelp: 'Benötigen Sie Hilfe?',
      monthly: '/Monat',
      active: 'Aktiv',
      plan: 'Plan',
      upgrading: 'Verarbeitung...',
      manageBilling: 'Abrechnung verwalten'
    }
  };

  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;

  const [upgradingPlan, setUpgradingPlan] = useState(null);

  useEffect(() => {
    const handler = (e) => { if (typeof e?.detail === 'string') setLang(e.detail); };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved) setLang(saved);
    const onStorage = (e) => { if (e.key === 'app_lang') setLang(e.newValue || 'en'); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Define subscription plans with Stripe Price IDs
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '€0',
      subtitle: 'Beta / €49 after',
      yearlyPrice: '€490/year',
      description: 'Perfect for trying out Dinery',
      color: 'from-gray-700 to-gray-800',
      priceId: null, // Free plan
      features: [
        { name: 'Visibility in Dinery app', value: true, icon: <Eye className="w-4 h-4" /> },
        { name: 'Publish offers per month', value: '2', icon: <BarChart3 className="w-4 h-4" /> },
        { name: 'Time-based reservations & codes', value: true, icon: <Clock className="w-4 h-4" /> },
        { name: 'Customer list & basic analytics', value: false, icon: <LineChart className="w-4 h-4" /> },
        { name: 'Push notifications to diners', value: false, icon: <Bell className="w-4 h-4" /> },
        { name: 'Advanced reporting', value: false, icon: <BarChart3 className="w-4 h-4" /> },
        { name: 'Dinery Points System', value: true, icon: <Award className="w-4 h-4" /> },
        { name: '24/7 support', value: true, icon: <Headphones className="w-4 h-4" /> },
        { name: 'Dedicated account manager', value: false, icon: <UserCheck className="w-4 h-4" /> },
        { name: 'Social media promotion', value: false, icon: <Video className="w-4 h-4" /> }
      ]
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '€99',
      subtitle: 'Most popular choice',
      yearlyPrice: '€990/year',
      description: 'Ideal for growing restaurants',
      color: 'from-orange-500 to-orange-600',
      popular: true,
      priceId: getEnvVar('VITE_STRIPE_GROWTH_PRICE_ID') || getEnvVar('REACT_APP_STRIPE_GROWTH_PRICE_ID'),
      features: [
        { name: 'Visibility in Dinery app', value: true, icon: <Eye className="w-4 h-4" /> },
        { name: 'Publish offers per month', value: 'Unlimited', icon: <BarChart3 className="w-4 h-4" /> },
        { name: 'Time-based reservations & codes', value: true, icon: <Clock className="w-4 h-4" /> },
        { name: 'Customer list & basic analytics', value: true, icon: <LineChart className="w-4 h-4" /> },
        { name: 'Push notifications to diners', value: true, icon: <Bell className="w-4 h-4" /> },
        { name: 'Advanced reporting', value: false, icon: <BarChart3 className="w-4 h-4" /> },
        { name: 'Dinery Points System', value: true, icon: <Award className="w-4 h-4" /> },
        { name: '24/7 support', value: true, icon: <Headphones className="w-4 h-4" /> },
        { name: 'Dedicated account manager', value: false, icon: <UserCheck className="w-4 h-4" /> },
        { name: 'Social media promotion', value: false, icon: <Video className="w-4 h-4" /> }
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '€149',
      subtitle: 'Maximum growth potential',
      yearlyPrice: '€1,490/year',
      description: 'Complete restaurant optimization',
      color: 'from-orange-600 to-orange-700',
      priceId: getEnvVar('VITE_STRIPE_PROFESSIONAL_PRICE_ID') || getEnvVar('REACT_APP_STRIPE_PROFESSIONAL_PRICE_ID'),
      features: [
        { name: 'Visibility in Dinery app', value: true, icon: <Eye className="w-4 h-4" /> },
        { name: 'Publish offers per month', value: 'Unlimited', icon: <BarChart3 className="w-4 h-4" /> },
        { name: 'Time-based reservations & codes', value: true, icon: <Clock className="w-4 h-4" /> },
        { name: 'Customer list & basic analytics', value: true, icon: <LineChart className="w-4 h-4" /> },
        { name: 'Push notifications to diners', value: 'Priority placement', icon: <Bell className="w-4 h-4" /> },
        { name: 'Advanced reporting', value: true, icon: <BarChart3 className="w-4 h-4" /> },
        { name: 'Dinery Points System', value: true, icon: <Award className="w-4 h-4" /> },
        { name: '24/7 support', value: true, icon: <Headphones className="w-4 h-4" /> },
        { name: 'Dedicated account manager', value: true, icon: <UserCheck className="w-4 h-4" /> },
        { name: 'Social media promotion', value: true, icon: <Video className="w-4 h-4" /> }
      ]
    }
  ];

  const [form, setForm] = useState({
    displayName: "",
    email: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    photoURL: "",
    contact_number: "",
    socialMediaURL: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordSaving, setPasswordSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (!user || !user.email) {
      alert("No user logged in");
      return;
    }

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      alert(t('passwordTooShort'));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert(t('passwordMismatch'));
      return;
    }

    setPasswordSaving(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordForm.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordForm.newPassword);

      alert(t('passwordUpdated'));
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error('Password update error', error);
      alert(`${t('passwordError')} ${error.message}`);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleUpgrade = async (plan) => {
    if (!user) {
      alert("Please log in to upgrade your plan");
      return;
    }

    if (!plan.priceId) {
      alert("This plan is not available for purchase");
      return;
    }

    setUpgradingPlan(plan.id);

    try {
      const customerDocRef = doc(firestore, `customers/${user.uid}`);
      
      let customerDoc = await getDoc(customerDocRef);
      
      if (!customerDoc.exists()) {
        await setDoc(customerDocRef, {
          email: user.email,
          metadata: { firebaseUID: user.uid }
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        customerDoc = await getDoc(customerDocRef);
        if (!customerDoc.exists()) throw new Error('Failed to create customer document');
      }

      const checkoutSessionRef = await addDoc(
        collection(firestore, `customers/${user.uid}/checkout_sessions`),
        {
          price: plan.priceId,
          success_url: `${window.location.origin}/account-settings?success=true&plan=${plan.id}`,
          cancel_url: `${window.location.origin}/account-settings?canceled=true`,
          metadata: { planId: plan.id },
        }
      );

      let timeoutId;
      const unsubscribe = onSnapshot(checkoutSessionRef, (snap) => {
        const data = snap.data();
        if (data?.url) {
          clearTimeout(timeoutId);
          window.location.href = data.url;
          unsubscribe();
        }
        if (data?.error) {
          clearTimeout(timeoutId);
          alert(`Error creating checkout session: ${data.error.message}`);
          unsubscribe();
          setUpgradingPlan(null);
        }
      });

      timeoutId = setTimeout(() => {
        unsubscribe();
        setUpgradingPlan(null);
        alert('Request timed out. Please try again or check your Stripe Extension configuration.');
      }, 10000);

    } catch (error) {
      console.error('Upgrade error:', error);
      alert(`Failed to initiate upgrade: ${error.message}`);
      setUpgradingPlan(null);
    }
  };

  // Handle customer portal for managing billing
  const handleManageBilling = async () => {
    if (!user) {
      alert("Please log in to manage your billing");
      return;
    }

    try {
      // Check if customer document exists first
      const customerDocRef = doc(firestore, `customers/${user.uid}`);
      const customerDoc = await getDoc(customerDocRef);
      
      if (!customerDoc.exists() || !customerDoc.data()?.stripeId) {
        alert("No billing information found. Please subscribe to a plan first.");
        return;
      }

      // Create a portal link document
      const portalLinkRef = await addDoc(
        collection(firestore, `customers/${user.uid}/checkout_sessions`),
        {
          return_url: `${window.location.origin}/account-settings`,
          mode: 'customer_portal',
        }
      );

      // Listen for the portal URL
      const unsubscribe = onSnapshot(portalLinkRef, (snap) => {
        const data = snap.data();
        if (data?.url) {
          window.location.href = data.url;
          unsubscribe(); // Stop listening once we have the URL
        }
        if (data?.error) {
          alert(`Error: ${data.error.message}`);
          unsubscribe();
        }
      });
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal. Please try again or contact support.');
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

  const fetchUserData = async () => {
    setLoading(true);
    try {
      if (isStaff) {
        // ── Staff: load from restaurants/{restaurantId}/staff ──────────────
        const { collection: col, query, where, getDocs } = await import("firebase/firestore");
        const staffSnap = await getDocs(
          query(
            col(firestore, "restaurants", staffRestaurantId, "staff"),
            where("uid", "==", user.uid)
          )
        );
        if (!staffSnap.empty) {
          const staffData = staffSnap.docs[0].data();
          setForm({
            displayName: staffData.name || "",
            email:        staffData.email || user.email || "",
            first_name:   staffData.firstName || "",
            middle_name:  "",
            last_name:    staffData.lastName || "",
            photoURL:     "",
            contact_number: staffData.mobilePhone || "",
            socialMediaURL: "",
          });
        }
        setCurrentPlan("starter");
        setSubscriptionStatus("active");
        setLoading(false);
        return; // skip owner subscription logic
      }

      // ── Owner: load from users collection ─────────────────────────────────
      const userDocRef = doc(firestore, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        setForm((prev) => ({ ...prev, ...userSnap.data() }));
      } else {
        setForm({
          displayName: "",
          email: user.email || "",
          first_name: "",
          middle_name: "",
          last_name: "",
          photoURL: user.photoURL || "",
          contact_number: "",
          socialMediaURL: "",
        });
      }

      // Fetch restaurant/subscription data
      const restaurantDocRef = doc(firestore, "restaurants", user.uid);
      const restaurantSnap = await getDoc(restaurantDocRef);
        if (restaurantSnap.exists()) {
          const restaurantData = restaurantSnap.data();
          setCurrentPlan(restaurantData.plan || 'starter');
          setSubscriptionStatus(restaurantData.subscriptionStatus || 'active');
        }

        // Listen to subscription status from Stripe extension
        const subscriptionsRef = collection(firestore, `customers/${user.uid}/subscriptions`);
        const unsubscribe = onSnapshot(
          subscriptionsRef, 
          (snapshot) => {
            if (snapshot.empty) {
              // No subscriptions yet, keep starter plan
              return;
            }
            
            snapshot.docs.forEach((doc) => {
              const subscription = doc.data();
              if (subscription.status === 'active' || subscription.status === 'trialing') {
                // Update plan based on active subscription
                const metadata = subscription.metadata;
                if (metadata?.planId) {
                  setCurrentPlan(metadata.planId);
                  setSubscriptionStatus('active');
                  
                  // Update restaurant document
                  setDoc(restaurantDocRef, {
                    plan: metadata.planId,
                    subscriptionStatus: 'active',
                    stripeSubscriptionId: doc.id,
                    updatedAt: new Date()
                  }, { merge: true }).catch(err => {
                    console.error('Error updating restaurant doc:', err);
                  });
                }
              } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
                setCurrentPlan('starter');
                setSubscriptionStatus('inactive');
              }
            });
          },
          (error) => {
            console.error("Error listening to subscriptions:", error);
            // Don't show alert, just log the error
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error("Failed to load user data:", error);
        alert("Failed to load user data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, firestore]);

useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      const planId = urlParams.get('plan');
      
      if (planId && user) {
        // Force-update restaurant doc immediately on success redirect
        const restaurantDocRef = doc(firestore, "restaurants", user.uid);
        setDoc(restaurantDocRef, {
          plan: planId,
          subscriptionStatus: 'active',
          updatedAt: new Date()
        }, { merge: true }).then(() => {
          setCurrentPlan(planId);
          setSubscriptionStatus('active');
          alert('Subscription successful! Your plan has been upgraded.');
        }).catch(err => {
          console.error('Error updating plan:', err);
          alert('Subscription successful! Your plan has been upgraded.');
        });
      } else {
        alert('Subscription successful! Your plan has been upgraded.');
      }
      
      window.history.replaceState({}, document.title, '/account-settings');
    } else if (urlParams.get('canceled') === 'true') {
      window.history.replaceState({}, document.title, '/account-settings');
    }
  }, [user, firestore]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

const handleSave = async () => {
  if (!user) {
    alert("No user logged in");
    return;
  }
  setSaving(true);
  try {
    if (isStaff) {
      // Find and update the staff doc
      const { collection: col, query, where, getDocs, updateDoc } = await import("firebase/firestore");
      const staffSnap = await getDocs(
        query(
          col(firestore, "restaurants", staffRestaurantId, "staff"),
          where("uid", "==", user.uid)
        )
      );
      if (!staffSnap.empty) {
        await updateDoc(staffSnap.docs[0].ref, {
          firstName:   form.first_name,
          lastName:    form.last_name,
          mobilePhone: form.contact_number,
          name:        `${form.first_name} ${form.last_name}`.trim(),
        });
      }
      alert("Profile saved successfully");
      setSaving(false);
      return;
    }

    const userDocRef = doc(firestore, "users", user.uid);
    await setDoc(userDocRef, form, { merge: true });
      alert("Account settings saved successfully");
    } catch (error) {
      alert("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getPlanBadgeColor = (planId) => {
    switch (planId) {
      case 'starter':
        return 'bg-gray-200 text-gray-800 border-gray-400';
      case 'growth':
        return 'bg-orange-200 text-orange-800 border-orange-400';
      case 'professional':
        return 'bg-orange-200 text-orange-800 border-orange-400';
      default:
        return 'bg-gray-200 text-gray-800 border-gray-400';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-200 text-green-800 border-green-400';
      case 'inactive':
        return 'bg-red-200 text-red-800 border-red-400';
      case 'suspended':
        return 'bg-yellow-200 text-yellow-800 border-yellow-400';
      default:
        return 'bg-gray-200 text-gray-800 border-gray-400';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 flex items-center justify-center transition-all duration-300 ${
        isSidebarMinimized ? 'md:ml-20' : 'md:ml-64'
      }`}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="text-center text-gray-600 mt-4 font-medium">{t('loadingProfile')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 transition-all duration-300 ${
      isSidebarMinimized ? 'md:ml-20' : 'md:ml-64'
    }`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {t('accountSettings')}
          </h1>
          <p className="text-gray-600">{t('manageProfile')}</p>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 w-full">
          {/* Profile Section with Plan Badge */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-6 md:px-8 py-8 md:py-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
            
            <div className="relative z-10 w-full">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {form.photoURL ? (
                    <img
                      src={form.photoURL}
                      alt="Profile"
                      className="w-28 h-28 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-2xl object-cover"
                    />
                  ) : (
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl border-4 border-white shadow-2xl bg-white flex items-center justify-center">
                      <svg className="w-14 h-14 md:w-16 md:h-16 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* User Info & Plan */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    {form.displayName || form.first_name || t('userProfile')}
                  </h2>
                  <p className="text-orange-100 text-base md:text-lg mb-4">{form.email}</p>
                  
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg ${getPlanBadgeColor(currentPlan)}`}>
                      <Crown className="w-4 h-4 md:w-5 md:h-5" />
                      {plans.find(p => p.id === currentPlan)?.name} {t('plan')}
                    </span>
                    <span className={`inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-lg ${getStatusBadgeColor(subscriptionStatus)}`}>
                      {subscriptionStatus === 'active' && <Check className="w-4 h-4 md:w-5 md:h-5" />}
                      {subscriptionStatus === 'active' ? t('active') : subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8 p-6 md:p-8 w-full">
            {/* Left Column - Personal Information & Password */}
            <div className="space-y-6">
              {/* Personal Information Section */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {t('personalInformation')}
                </h3>
                
                <div className="space-y-4">
                  {/* Display Name */}
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                      {t('displayName')}
                    </label>
                    <input
                      type="text"
                      name="displayName"
                      value={form.displayName || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm hover:border-orange-300 text-sm md:text-base"
                      placeholder={t('displayName')}
                    />
                  </div>

                  {/* First & Last Name Row */}
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                        {t('firstName')}
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={form.first_name || ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm hover:border-orange-300 text-sm md:text-base"
                        placeholder={t('firstName')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                        {t('lastName')}
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={form.last_name || ""}
                        onChange={handleChange}
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm hover:border-orange-300 text-sm md:text-base"
                        placeholder={t('lastName')}
                      />
                    </div>
                  </div>

                  {/* Middle Name */}
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                      {t('middleName')} <span className="text-gray-400 font-normal">{t('optional')}</span>
                    </label>
                    <input
                      type="text"
                      name="middle_name"
                      value={form.middle_name || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm hover:border-orange-300 text-sm md:text-base"
                      placeholder={t('middleName')}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  {t('contactInformation')}
                </h3>

                <div className="space-y-4">
                  {/* Email (disabled) */}
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                      {t('emailAddress')}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed shadow-sm text-sm md:text-base"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {t('emailAddress')} cannot be changed here
                    </p>
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                      {t('contactNumber')}
                    </label>
                    <input
                      type="tel"
                      name="contact_number"
                      value={form.contact_number || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm hover:border-blue-300 text-sm md:text-base"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  {/* Social Media URL */}
                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                      {t('socialMediaProfile')}
                    </label>
                    <div className="flex gap-2 md:gap-3">
                      <input
                        type="url"
                        name="socialMediaURL"
                        value={form.socialMediaURL || ""}
                        readOnly
                        className="flex-1 px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-xl bg-gray-50 cursor-not-allowed text-gray-600 shadow-sm text-sm md:text-base"
                        placeholder={`${t('edit')}...`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt(
                            `Enter your social media profile URL:`,
                            form.socialMediaURL || ""
                          );
                          if (url !== null) {
                            setForm((prev) => ({ ...prev, socialMediaURL: url.trim() }));
                          }
                        }}
                        className="px-4 py-2.5 md:px-6 md:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all duration-200 hover:scale-105 shadow-lg text-xs md:text-sm"
                      >
                        {t('edit')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Change Password Section */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm-2 6V6a2 2 0 114 0v2H8z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  {t('changePassword')}
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                        {t('currentPassword')}
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm hover:border-orange-300 text-sm md:text-base"
                      />
                    </div>

                    <div>
                      <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                        {t('newPassword')}
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white shadow-sm hover:border-orange-300 text-sm md:text-base"
                        placeholder={t('newPassword')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                      {t('confirmPassword')}
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white shadow-sm hover:border-purple-300 text-sm md:text-base"
                      placeholder={t('confirmPassword')}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={passwordSaving}
                    className={`px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-bold shadow-lg text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transform hover:scale-105 transition-all duration-200 text-xs md:text-sm ${
                      passwordSaving ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                    }`}
                  >
                    {passwordSaving ? t('updatingPassword') : t('updatePassword')}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  className="flex-1 px-5 py-3 md:px-6 md:py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all duration-200 hover:scale-105 shadow-sm text-sm md:text-base"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex-1 px-5 py-3 md:px-8 md:py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-sm md:text-base ${
                    saving ? "opacity-50 cursor-not-allowed scale-100" : ""
                  }`}
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('saving')}
                    </span>
                  ) : (
                    t('saveChanges')
                  )}
                </button>
              </div>
            </div>

            {/* Right Column - Subscription Plans */}
            {!isStaff && (
            <div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 md:p-6 border border-orange-100 sticky top-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-white border-2 border-orange-200 rounded-full px-4 py-1.5 md:px-5 md:py-2 mb-3 shadow-sm">
                    <Star className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
                    <span className="text-orange-700 font-bold text-xs md:text-sm">{t('yourSubscription')}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{t('choosePlan')}</h3>
                  <p className="text-gray-600 text-xs md:text-sm">{t('upgradeAnytime')}</p>
                </div>

                <div className="space-y-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                        currentPlan === plan.id
                          ? 'ring-4 ring-orange-400 shadow-xl scale-[1.02] md:scale-105'
                          : 'hover:scale-[1.01] md:hover:scale-102 shadow-md hover:shadow-lg'
                      }`}
                    >
                      {/* Current Plan Badge */}
                      {currentPlan === plan.id && (
                        <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-green-500 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold z-20 shadow-lg flex items-center gap-1">
                          <Check className="w-2 h-2 md:w-3 md:h-3" />
                          {t('currentPlan')}
                        </div>
                      )}

                      <div className={`p-4 md:p-5 ${
                        currentPlan === plan.id
                          ? 'bg-gradient-to-br from-orange-400 to-orange-500'
                          : 'bg-white'
                      }`}>
                        {/* Plan Header */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className={`text-lg md:text-xl font-bold ${
                              currentPlan === plan.id ? 'text-white' : 'text-gray-900'
                            }`}>
                              {plan.name}
                            </h4>
                            <div className={`text-xl md:text-2xl font-bold ${
                              currentPlan === plan.id ? 'text-white' : 'text-orange-600'
                            }`}>
                              {plan.price}
                              <span className={`text-[10px] md:text-xs font-normal ${
                                currentPlan === plan.id ? 'text-orange-100' : 'text-gray-500'
                              }`}>
                                {t('monthly')}
                              </span>
                            </div>
                          </div>
                          <p className={`text-[10px] md:text-xs ${
                            currentPlan === plan.id ? 'text-orange-100' : 'text-gray-600'
                          }`}>
                            {plan.subtitle}
                          </p>
                        </div>

                        {/* Key Features - Show 5 most important */}
                        <div className="space-y-2 mb-4">
                          {plan.features.slice(0, 5).map((feature, index) => (
                            <div key={index} className="flex items-center justify-between text-xs md:text-sm">
                              <div className="flex items-center gap-1.5 md:gap-2 flex-1">
                                <div className={`${
                                  currentPlan === plan.id ? 'text-orange-200' : 'text-gray-500'
                                }`}>
                                  {feature.icon}
                                </div>
                                <span className={`text-[10px] md:text-xs ${
                                  currentPlan === plan.id ? 'text-white' : 'text-gray-700'
                                }`}>
                                  {feature.name}
                                </span>
                              </div>
                              <div>
                                {feature.value === true ? (
                                  <Check className={`w-3 h-3 md:w-4 md:h-4 ${
                                    currentPlan === plan.id ? 'text-white' : 'text-green-500'
                                  }`} />
                                ) : feature.value === false ? (
                                  <X className={`w-3 h-3 md:w-4 md:h-4 ${
                                    currentPlan === plan.id ? 'text-orange-300' : 'text-gray-400'
                                  }`} />
                                ) : (
                                  <span className={`text-[10px] md:text-xs font-bold ${
                                    currentPlan === plan.id ? 'text-white' : 'text-orange-600'
                                  }`}>
                                    {feature.value}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Action Button */}
                        {currentPlan === plan.id ? (
                          <button
                            disabled
                            className="w-full py-2.5 md:py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2 text-xs md:text-sm"
                          >
                            <Check className="w-3 h-3 md:w-4 md:h-4" />
                            {t('currentPlan')}
                          </button>
                        ) : (
                        <button
                            onClick={() => handleUpgrade(plan)}
                            disabled={upgradingPlan === plan.id}
                            className={`w-full py-2.5 md:py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm ${upgradingPlan === plan.id ? 'opacity-75 cursor-not-allowed hover:scale-100' : ''}`}
                          >
                            {upgradingPlan === plan.id ? (
                              <>
                                <svg className="animate-spin h-3 w-3 md:h-4 md:w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t('upgrading')}
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                                {t('upgradeTo')} {plan.name}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Manage Billing Button */}
                {currentPlan !== 'starter' && (
                  <div className="mt-4">
                    <button
                      onClick={handleManageBilling}
                      className="w-full py-2.5 md:py-3 bg-white border-2 border-orange-300 text-orange-700 rounded-xl font-bold hover:bg-orange-50 transition-all duration-300 hover:scale-105 shadow-md text-xs md:text-sm"
                    >
                      {t('manageBilling')}
                    </button>
                  </div>
                )}

                {/* Help Section */}
                <div className="mt-6 bg-white/80 backdrop-blur-sm border-2 border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-xs md:text-sm text-gray-700">
                    <span className="font-bold text-orange-700">{t('needHelp')}</span>
                    <br />
                    <a href="mailto:support@dinery.ai" className="text-orange-600 hover:text-orange-700 font-semibold transition-colors text-xs md:text-sm">
                      support@dinery.ai
                    </a>
                  </p>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-600 text-xs md:text-sm flex items-center justify-center gap-2">
            <svg className="w-3 h-3 md:w-4 md:h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t('secureInfo')}
          </p>
        </div>
      </div>
    </div>
  );
}