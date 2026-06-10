const TEST_PATIENT_ID = 1
const TEST_DOCTOR_ID = 13
const API_BASE_URL = "http://127.0.0.1:8000/api"

function formatDateTime(value) {
  if (!value) {
    return "暂无更新时间"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

Page({
  data: {
    patientId: TEST_PATIENT_ID,
    doctorId: TEST_DOCTOR_ID,
    isLoading: true,
    errorMessage: "",
    latestPlan: null,
    historyPlans: [],
  },

  onShow() {
    this.loadPlans()
  },

  loadPlans() {
    const { patientId, doctorId } = this.data

    this.setData({
      isLoading: true,
      errorMessage: "",
    })

    wx.request({
      url: `${API_BASE_URL}/rehab-plans`,
      method: "GET",
      data: {
        patient_id: patientId,
        doctor_id: doctorId,
      },
      success: (response) => {
        const { data } = response
        const plans =
          response.statusCode === 200 &&
          data &&
          data.code === 200 &&
          Array.isArray(data.data)
            ? data.data
            : []
        const normalizedPlans = plans.map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          createdAt: formatDateTime(item.created_at),
        }))

        this.setData({
          latestPlan: normalizedPlans[0] || null,
          historyPlans: normalizedPlans.slice(1),
          isLoading: false,
        })
      },
      fail: () => {
        this.setData({
          isLoading: false,
          errorMessage: "暂时无法读取训练方案，请稍后重试。",
          latestPlan: null,
          historyPlans: [],
        })
      },
    })
  },
})
