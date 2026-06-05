import React, { useEffect, useState } from "react";
import { request, RequestErr } from "../request";

import logo from "../assets/regular-no-gradient-8x.png";
import darkLogo from "../assets/dark-logo-8x.png";
import { dialog } from "../components/Dialog";
import PinInput from "../components/PinInput";

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export default function SignUp() {
  const [invitationCode, setInvitationCode] = useState("");
  const [username, setUsername] = useState("");
  const [passwd, setPasswd] = useState("");
  const [passwdRepeat, setPasswdRepeat] = useState("");
  const [netId, setNetId] = useState("");
  const [netIdPasswd, setNetIdPasswd] = useState("");
  const [paymentPasswd, setPaymentPasswd] = useState("");
  const [errorMsg, setErrorMsg] = useState<string>();

  // Validation & MFA states
  const [netIdValidation, setNetIdValidation] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [netIdErrorMsg, setNetIdErrorMsg] = useState<string>("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSessionId, setMfaSessionId] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpValidation, setOtpValidation] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [otpErrorMsg, setOtpErrorMsg] = useState<string>("");
  const [verificationId, setVerificationId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(document.location.search);
    const code = params.get("code");
    if (code === null) {
      window.location.href = "/";
      return;
    }

    request("/invitation", "GET", {
      Code: code
    }).then((valid: boolean) => {
      if (!valid) {
        window.location.href = "/";
      } else {
        setInvitationCode(code);
      }
    }).catch((e) => {
      dialog("Info", "Error", `Service is temporally unavailable: ${e}`).finally(() => {
        window.location.href = "/";
      });
    });
  }, []);

  const verifyNetId = async () => {
    if (!netId || !netIdPasswd) return;
    setNetIdValidation('pending');
    setNetIdErrorMsg("");
    setMfaRequired(false);
    setOtpSent(false);
    setOtp("");
    setOtpValidation('idle');
    setOtpErrorMsg("");
    setVerificationId("");

    try {
      const response = await request("/signup/verify_netid", "POST", undefined, {
        NetId: netId,
        NetIdPasswd: netIdPasswd,
      }) as { mfaRequired: boolean, mfaSessionId: string, phone?: string };

      setMfaSessionId(response.mfaSessionId);
      if (response.mfaRequired && response.phone) {
        setPhone(response.phone);
        setMfaRequired(true);
      } else {
        setNetIdValidation('success');
        setVerificationId(response.mfaSessionId);
      }
    } catch (error) {
      setNetIdValidation('error');
      if (error instanceof RequestErr) {
        setNetIdErrorMsg(error.message);
      } else {
        setNetIdErrorMsg("Verification failed");
      }
    }
  };

  const handleSendOtp = async () => {
    setOtpErrorMsg("");
    try {
      await request("/signup/send_otp", "POST", undefined, {
        MfaSessionId: mfaSessionId,
      });
      setOtpSent(true);
    } catch (error) {
      if (error instanceof RequestErr) {
        setOtpErrorMsg(error.message);
      } else {
        setOtpErrorMsg("Failed to send OTP");
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setOtpValidation('pending');
    setOtpErrorMsg("");
    try {
      const response = await request("/signup/submit_otp", "POST", undefined, {
        MfaSessionId: mfaSessionId,
        Otp: otp,
      }) as { mfaSessionId: string };

      setOtpValidation('success');
      setNetIdValidation('success');
      setVerificationId(response.mfaSessionId);
    } catch (error) {
      setOtpValidation('error');
      if (error instanceof RequestErr) {
        setOtpErrorMsg(error.message);
      } else {
        setOtpErrorMsg("Invalid OTP code");
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(undefined);
    if (netIdValidation !== 'success' || !verificationId) {
      setErrorMsg("Please verify your NetID first.");
      return;
    }

    try {
      await request("/signup", "POST", undefined, {
        User: username,
        Passwd: passwd,
        PaymentPasswd: paymentPasswd.length === 6 ? paymentPasswd : null,
        InvitationCode: invitationCode,
        VerificationId: verificationId,
      });
      window.location.href = "/dashboard";
    } catch (error) {
      if (error instanceof RequestErr) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Service is temporally unavailable!");
      }
    }
  };

  return (
    <>
      <main className="flex items-center justify-center min-h-screen">
        <form onSubmit={handleSignup} className="flex flex-col lg:flex-row gap-4 lg:gap-16 h-fit box-border p-8 m-5 rounded-2xl shadow-lg bg-white dark:bg-slate-700">
          <div className="flex flex-col w-full max-w-xl">
            <h1 className="text-xl font-bold uppercase mt-2 mb-6 h-10 -ml-3 flex items-center">
              <img src={logo} alt="XJTUTennis" className="h-full dark:hidden" />
              <img src={darkLogo} alt="XJTUTennis" className="h-full hidden dark:inline" />
            </h1>
            <br />
            <div className="flex flex-col my-5">
              <h1 className="text-xl font-bold mt-4 mb-6">Sign Up</h1>
              <label htmlFor="username" className="text-md mt-2">Username<sup className="text-red-600 dark:text-red-400">*</sup></label>
              <input type="text" required className="p-1 rounded-md outline-none border-2 border-transparent mt-1 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="username" id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4">
                A unique username for login.
              </p>

              <label htmlFor="password" className="text-md mt-2">Password<sup className="text-red-600 dark:text-red-400">*</sup></label>
              <input type="password" required maxLength={72} className="p-1 rounded-md outline-none border-2 border-transparent mt-1 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="passwd" id="password" value={passwd} onChange={(e) => {
                setPasswd(e.target.value);
                if (e.target.value !== passwdRepeat) {
                  setErrorMsg("Password not match!");
                } else {
                  setErrorMsg(undefined);
                }
              }} />
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4">
                The password for you to login. The password should not be longer than 72 characters.
              </p>

              <label htmlFor="password-repeat" className="text-md mt-2">Repeat Password<sup className="text-red-600 dark:text-red-400">*</sup></label>
              <input type="password" required maxLength={72} pattern={escapeRegExp(passwd)} className="p-1 rounded-md outline-none border-2 border-transparent mt-1 mb-4 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="passwd-repeat" id="password-repeat" value={passwdRepeat} onChange={(e) => {
                setPasswdRepeat(e.target.value);
                if (e.target.value !== passwd) {
                  setErrorMsg("Password not match!");
                } else {
                  setErrorMsg(undefined);
                }
              }} />
            </div>
          </div>
          <div className="flex flex-col my-5 w-full max-w-xl">
            <label htmlFor="netid" className="text-md mt-2">NetID<sup className="text-red-600 dark:text-red-400">*</sup></label>
            <input type="text" required className="p-1 rounded-md outline-none border-2 border-transparent mt-1 focus:border-blue-400 invalid:border-red-400 focus:invalid:border-red-400 bg-gray-50 dark:bg-slate-600" name="netid" id="netid" value={netId} onChange={(e) => setNetId(e.target.value)} />
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4">
              The NetID for XJTU Login Authentication, e.g. "3124100000".
              NetID is stored <b>in plain text</b> to identify and block malicious users. If you do not want to share your NetID with the maintainer, please do not sign in.
            </p>

            <label htmlFor="netid-passwd" className="text-md mt-2">NetID Password<sup className="text-red-600 dark:text-red-400">*</sup></label>
            <div className="relative flex flex-col mt-1">
              <input
                type="password"
                required
                className={`p-1 pr-8 rounded-md outline-none border-2 mt-1 focus:border-blue-400 bg-gray-50 dark:bg-slate-600 transition-colors ${netIdValidation === 'success' ? 'border-green-500 focus:border-green-500' :
                  netIdValidation === 'error' ? 'border-red-500 focus:border-red-500' : 'border-transparent'
                  }`}
                name="netid-passwd"
                id="netid-passwd"
                value={netIdPasswd}
                onChange={(e) => setNetIdPasswd(e.target.value)}
                onBlur={() => {
                  if (netId && netIdPasswd) {
                    verifyNetId();
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                {netIdValidation === 'pending' && (
                  <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {netIdValidation === 'success' && (
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {netIdValidation === 'error' && (
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {netIdErrorMsg && <p className="text-red-500 text-xs mt-1">{netIdErrorMsg}</p>}

            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 text-justify">
              XJTU NetID Password. The NetID password is encrypted by your login password, and no one can know your NetID password including the maintainer of the platform.
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4 text-justify">
              Horizontal if the server is held on HTTP protocol instead of HTTPS, there could be man-in-the-middle (MITM) attack to get your password. Be aware of this.
            </p>

            {mfaRequired && (
              <div className="flex flex-col gap-3 mt-2 mb-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 transition-all">
                <p className="text-xs text-zinc-500">
                  MFA authentication required. Send a verification code to <strong>{phone}</strong>.
                </p>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="p-2 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors"
                  >
                    Send OTP
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          pattern="[0-9]+"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className={`p-2 w-full text-sm rounded-md outline-none border bg-white dark:bg-slate-600 ${otpValidation === 'success' ? 'border-green-500' :
                            otpValidation === 'error' ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
                            }`}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          {otpValidation === 'pending' && (
                            <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          {otpValidation === 'success' && (
                            <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {otpValidation === 'error' && (
                            <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otp.length !== 6 || otpValidation === 'pending'}
                        className="p-2 text-sm font-semibold rounded-md bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white transition-colors"
                      >
                        Verify OTP
                      </button>
                    </div>
                    {otpErrorMsg && <p className="text-red-500 text-xs mt-1">{otpErrorMsg}</p>}
                  </div>
                )}
              </div>
            )}

            <label htmlFor="payment" className="text-md mt-2">Payment Password</label>
            <div className="self-center my-3 flex gap-2">
              <PinInput show={false} value={paymentPasswd} onChange={(newVal) => { setPaymentPasswd(newVal) }} />
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              The payment password of your XJTU student / faculty card, usually is a 6-digit PIN. Payment password is not required for payed courts, as long as your payment did not exceed the limit.
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 mb-4">
              Like NetID password, payment password is also encrypted by your login password. However, if the server is held on HTTP protocol instead of HTTPS, there could be man-in-the-middle (MITM) attack to get your password. Be aware of this.
            </p>

            {errorMsg && <div className="text-red-600 dark:text-red-400">{errorMsg}</div>}
            <input
              type="submit"
              disabled={netIdValidation !== 'success' || !verificationId}
              className="p-2 cursor-pointer mt-12 rounded-full bg-slate-500 hover:bg-slate-400 disabled:bg-slate-300 disabled:cursor-not-allowed text-white transition-colors"
              value={
                netIdValidation === 'success'
                  ? "Sign Up"
                  : netIdValidation === 'pending'
                    ? "Verifying NetID..."
                    : "Verify NetID to Sign Up"
              }
            />
          </div>
        </form>
      </main>
    </>
  );
}
