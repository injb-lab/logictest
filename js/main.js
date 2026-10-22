// localStorage에서 구독 배열을 저장하고 다시 읽을 때 사용할 고유한 이름입니다.
const STORAGE_KEY = "subscription-tracker-data";
// HTML에서 폼과 목록 요소를 찾아 변수에 저장합니다. 이후 이 변수로 이벤트를 등록합니다.
const subscriptionForm = document.getElementById("subscription-form");
const subscriptionList = document.getElementById("subscription-list");
const cancelEditButton = document.getElementById("cancel-edit");
// 현재 화면에서 다루는 전체 구독 배열입니다. 페이지가 처음 열릴 때 저장소 값으로 채웁니다.
let subscriptions = [];
// 수정 중인 구독 ID입니다. null이면 새 구독 등록 상태입니다.
let editingId = null;

// 오늘 날짜를 계산 함수가 기대하는 YYYY-MM-DD 형식으로 만듭니다.
function getTodayString() {
  const today = new Date();
  // 월은 0부터 시작하므로 1을 더하고, 한 자리 월/일 앞에는 0을 붙입니다.
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 저장 데이터나 폼 입력 데이터가 앱에서 사용하는 구독 형식에 맞는지 확인합니다.
function isValidSubscription(subscription) {
  // 각 항목이 없거나, 글자/숫자 형식이 맞지 않으면 false를 돌려줍니다.
  // 저장된 JSON은 사용자가 직접 수정했을 수도 있으므로 불러올 때도 검사해야 합니다.
  return subscription &&
    typeof subscription.id === "string" &&
    typeof subscription.name === "string" &&
    subscription.name.trim().length > 0 &&
    Number.isFinite(subscription.amount) &&
    subscription.amount > 0 &&
    (subscription.cycle === "monthly" || subscription.cycle === "yearly") &&
    typeof subscription.nextPaymentDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(subscription.nextPaymentDate) &&
    typeof subscription.category === "string" &&
    subscription.category.trim().length > 0;
}

// 브라우저 저장소에서 데이터를 읽고 JSON을 자바스크립트 배열로 복원합니다.
function loadSubscriptions() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    // 아직 한 번도 저장하지 않았다면 정상적인 첫 실행이므로 빈 배열로 시작합니다.
    if (savedData === null) return [];

    // localStorage에는 문자열만 저장되므로 JSON.parse로 원래 배열/객체로 변환합니다.
    const parsedData = JSON.parse(savedData);
    // 배열이 아니거나 항목 하나라도 형식이 틀리면 안전한 데이터로 취급하지 않습니다.
    if (!Array.isArray(parsedData) || !parsedData.every(isValidSubscription)) {
      throw new Error("저장된 구독 데이터의 형식이 올바르지 않습니다.");
    }
    return parsedData;
  } catch (error) {
    // JSON 오류나 저장소 접근 오류를 개발자 도구에 남기고 사용자에게도 안내합니다.
    console.error("구독 데이터를 불러오지 못했습니다.", error);
    showNotice("저장된 구독 데이터를 읽지 못했습니다. 브라우저 개발자 도구에서 오류를 확인해 주세요.");
    return [];
  }
}

// 현재 구독 배열 전체를 JSON 문자열로 변환해 브라우저에 저장합니다.
function saveSubscriptions() {
  try {
    // 배열/객체는 localStorage에 바로 저장할 수 없어서 문자열로 바꿔 저장합니다.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    showNotice("");
    // 저장 성공 여부를 호출한 쪽에서 확인할 수 있도록 true를 반환합니다.
    return true;
  } catch (error) {
    // 저장 용량 부족 등의 실패를 조용히 무시하지 않고 로그와 안내문으로 알립니다.
    console.error("구독 데이터를 저장하지 못했습니다.", error);
    showNotice("브라우저 저장 공간에 저장하지 못했습니다. 저장 공간 설정을 확인해 주세요.");
    return false;
  }
}

// 오늘 날짜를 기준으로 목록, 요약, 카테고리 비중을 한 번에 새로 그립니다.
function refreshView() {
  renderApp(subscriptions, getTodayString());
}

// 입력 폼을 초기 상태로 되돌리고 수정 모드 관련 표시도 함께 초기화합니다.
function resetForm() {
  subscriptionForm.reset();
  editingId = null;
  document.getElementById("form-title").textContent = "구독 추가";
  document.getElementById("submit-button").textContent = "구독 추가하기";
  cancelEditButton.hidden = true;
}

// 선택한 카드의 정보를 폼에 채워 넣고 폼을 수정 모드로 바꿉니다.
function startEditing(subscription) {
  // 이 ID를 기억해 두면 저장할 때 새 항목을 추가하지 않고 같은 구독을 교체할 수 있습니다.
  editingId = subscription.id;
  // 폼의 입력 요소들은 name 속성으로 찾을 수 있습니다. 각 입력칸에 현재 값을 채웁니다.
  subscriptionForm.elements.name.value = subscription.name;
  subscriptionForm.elements.amount.value = String(subscription.amount);
  subscriptionForm.elements.cycle.value = subscription.cycle;
  subscriptionForm.elements.nextPaymentDate.value = subscription.nextPaymentDate;
  subscriptionForm.elements.category.value = subscription.category;
  document.getElementById("form-title").textContent = "구독 수정";
  document.getElementById("submit-button").textContent = "변경사항 저장";
  cancelEditButton.hidden = false;
  document.getElementById("name").focus();
}

// submit 이벤트는 새 항목 추가와 기존 항목 수정을 모두 처리합니다.
subscriptionForm.addEventListener("submit", (event) => {
  // 브라우저가 폼 제출 후 페이지를 새로고침하는 기본 동작을 막습니다.
  event.preventDefault();
  // 사용자가 입력한 폼 필드들을 name 속성을 기준으로 읽을 수 있게 모읍니다.
  const formData = new FormData(subscriptionForm);
  // 수정 중이면 기존 데이터가 여전히 목록에 있는지 찾습니다. 새 항목 추가 중이면 null입니다.
  const currentData = editingId
    ? subscriptions.find((subscription) => subscription.id === editingId)
    : null;
  const subscription = {
    // 수정할 때는 기존 ID를 보존합니다. 새 구독에는 고유 ID를 생성합니다.
    // randomUUID를 지원하지 않는 브라우저를 위해 시간+임의 문자열 대체 방법도 둡니다.
    id: editingId || (typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`),
    name: String(formData.get("name")).trim(),
    amount: Number(formData.get("amount")),
    cycle: String(formData.get("cycle")),
    nextPaymentDate: String(formData.get("nextPaymentDate")),
    category: String(formData.get("category")).trim()
  };

  // 브라우저의 required 검사 외에도 자바스크립트에서 데이터 형식을 한 번 더 확인합니다.
  if (!isValidSubscription(subscription)) {
    showNotice("입력한 구독 정보를 다시 확인해 주세요.");
    return;
  }

  // 수정 모드인데 기존 항목이 사라졌다면 잘못된 갱신을 하지 않고 사용자에게 알립니다.
  if (editingId && !currentData) {
    showNotice("수정할 구독을 찾을 수 없습니다. 목록을 새로 확인해 주세요.");
    resetForm();
    return;
  }

  if (editingId) {
    // 기존 배열을 새 배열로 만들되, ID가 같은 항목만 새 입력값으로 교체합니다.
    subscriptions = subscriptions.map((item) => item.id === editingId ? subscription : item);
  } else {
    // 새 구독이면 기존 배열 끝에 추가한 새 배열을 만듭니다.
    subscriptions = [...subscriptions, subscription];
  }

  // 화면에 반영하기 전에 저장하고, 저장 후 최신 배열로 화면을 다시 그립니다.
  saveSubscriptions();
  refreshView();
  resetForm();
});

// 목록 컨테이너 한 곳에서 모든 카드의 버튼 클릭을 처리합니다.
// 카드가 새로 그려져도 버튼마다 이벤트를 다시 등록할 필요가 없습니다.
subscriptionList.addEventListener("click", (event) => {
  // 실제 클릭된 요소가 버튼이 아니거나 action 데이터가 없으면 처리하지 않습니다.
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  // 버튼에 적어 둔 ID로 현재 배열에서 대상 구독을 찾습니다.
  const subscription = subscriptions.find((item) => item.id === button.dataset.id);
  if (!subscription) return;

  if (button.dataset.action === "edit") {
    // 수정 버튼이면 해당 데이터를 폼에 채우고 아래 삭제 처리로 넘어가지 않습니다.
    startEditing(subscription);
    return;
  }

  if (button.dataset.action === "delete") {
    // 실수로 삭제하지 않도록 브라우저 확인 창에서 사용자가 동의해야 진행합니다.
    const confirmed = window.confirm(`"${subscription.name}" 구독을 삭제할까요?`);
    if (!confirmed) return;
    // 삭제 대상 외의 항목만 남긴 새 배열을 만들고 저장/화면 갱신을 수행합니다.
    subscriptions = subscriptions.filter((item) => item.id !== subscription.id);
    saveSubscriptions();
    refreshView();
    if (editingId === subscription.id) resetForm();
  }
});

// 수정 취소 버튼을 누르면 폼 값을 비우고 새 구독 추가 상태로 되돌립니다.
cancelEditButton.addEventListener("click", resetForm);

// 페이지가 준비되면 저장된 데이터를 먼저 읽고, 그 데이터로 처음 화면을 그립니다.
subscriptions = loadSubscriptions();
refreshView();
