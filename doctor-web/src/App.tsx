/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import LoginView from "./components/LoginView";
import LayoutWrapper from "./components/LayoutWrapper";
import PatientsListView from "./components/PatientsListView";
import PatientDetailView from "./components/PatientDetailView";
import { ApiResponse, Patient } from "./types";

type AppRoute = "login" | "patients" | "patient-detail";

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>("login");
  const [activePatientId, setActivePatientId] = useState<number | null>(null);
  const [doctorId, setDoctorId] = useState<number>(0);
  const [doctorName, setDoctorName] = useState<string>("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isPatientsLoading, setIsPatientsLoading] = useState<boolean>(false);
  const [patientsError, setPatientsError] = useState<string>("");

  const handleLogout = () => {
    setDoctorId(0);
    setDoctorName("");
    setActivePatientId(null);
    setPatients([]);
    setPatientsError("");
    setCurrentRoute("login");

    localStorage.removeItem("doc_id");
    localStorage.removeItem("doc_name");
    localStorage.removeItem("current_route");
    localStorage.removeItem("active_patient_id");
  };

  const handleNavigateToList = () => {
    setActivePatientId(null);
    setCurrentRoute("patients");
    localStorage.setItem("current_route", "patients");
    localStorage.removeItem("active_patient_id");
  };

  const fetchPatientsList = async (targetDoctorId: number) => {
    try {
      setIsPatientsLoading(true);
      setPatientsError("");

      const response = await fetch(`/api/doctors/${targetDoctorId}/patients`);
      const json: ApiResponse<Patient[]> = await response.json();

      if (!response.ok || json.code !== 200) {
        const errorMessage =
          json.message || "患者列表加载失败，请确认当前登录的是有效医生账号。";
        setPatients([]);
        setPatientsError(errorMessage);
        if (currentRoute === "patient-detail") {
          handleNavigateToList();
        }
        return;
      }

      setPatients(json.data ?? []);
    } catch (err) {
      console.error("Failed to load patients list:", err);
      setPatients([]);
      setPatientsError("无法连接后端服务，请确认 FastAPI 已启动。");
      if (currentRoute === "patient-detail") {
        handleNavigateToList();
      }
    } finally {
      setIsPatientsLoading(false);
    }
  };

  const handleLoginSuccess = (docId: number, docName: string) => {
    setDoctorId(docId);
    setDoctorName(docName);
    setActivePatientId(null);
    setPatientsError("");
    setCurrentRoute("patients");

    localStorage.setItem("doc_id", String(docId));
    localStorage.setItem("doc_name", docName);
    localStorage.setItem("current_route", "patients");
    localStorage.removeItem("active_patient_id");
  };

  const handleSelectPatient = (patientId: number) => {
    setActivePatientId(patientId);
    setCurrentRoute("patient-detail");
    localStorage.setItem("current_route", "patient-detail");
    localStorage.setItem("active_patient_id", String(patientId));
  };

  useEffect(() => {
    const storedDocId = localStorage.getItem("doc_id");
    const storedDocName = localStorage.getItem("doc_name");
    const storedRoute = localStorage.getItem("current_route");
    const storedActivePatientId = localStorage.getItem("active_patient_id");

    if (!storedDocId || !storedDocName) {
      return;
    }

    const parsedDocId = Number.parseInt(storedDocId, 10);
    if (!parsedDocId) {
      handleLogout();
      return;
    }

    setDoctorId(parsedDocId);
    setDoctorName(storedDocName);

    if (storedRoute === "patient-detail" && storedActivePatientId) {
      setCurrentRoute("patient-detail");
      setActivePatientId(Number.parseInt(storedActivePatientId, 10) || null);
      return;
    }

    setCurrentRoute("patients");
  }, []);

  useEffect(() => {
    if (!doctorId) {
      return;
    }

    void fetchPatientsList(doctorId);
  }, [doctorId]);

  useEffect(() => {
    if (currentRoute !== "patient-detail") {
      return;
    }

    if (!activePatientId) {
      handleNavigateToList();
      return;
    }

    if (!isPatientsLoading && patients.length > 0) {
      const patientExists = patients.some((patient) => patient.id === activePatientId);
      if (!patientExists) {
        handleNavigateToList();
      }
    }
  }, [activePatientId, currentRoute, isPatientsLoading, patients]);

  const activePatient = patients.find((patient) => patient.id === activePatientId);

  if (currentRoute === "login") {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <LayoutWrapper
      doctorId={doctorId}
      doctorName={doctorName}
      onLogout={handleLogout}
      currentRoute={currentRoute}
      activePatientName={activePatient?.name}
      onNavigateToList={handleNavigateToList}
    >
      <div className="space-y-6">
        {currentRoute === "patients" && (
          <PatientsListView
            patients={patients}
            isLoading={isPatientsLoading}
            errorMessage={patientsError}
            onSelectPatient={handleSelectPatient}
            doctorName={doctorName}
          />
        )}

        {currentRoute === "patient-detail" && activePatient ? (
          <PatientDetailView
            patient={activePatient}
            doctorId={doctorId}
            onBackToList={handleNavigateToList}
          />
        ) : currentRoute === "patient-detail" ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800">当前患者未找到或尚未加载完成</p>
            <p className="text-xs text-slate-500">
              请返回患者列表重新选择病案，或检查当前医生账号是否有效。
            </p>
            <div>
              <button
                onClick={handleNavigateToList}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                返回患者列表
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </LayoutWrapper>
  );
}
