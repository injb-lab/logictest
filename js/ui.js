// 원화 금액에 천 단위 쉼표를 붙일 때 매번 새 포매터를 만들지 않도록 한 번만 준비합니다.
const currencyFormatter = new Intl.NumberFormat("ko-KR");

// 숫자를 한국식 원화 문자열로 바꿉니다. 예: 12000 -> "12,000원".
function formatWon(amount) {
  return `${currencyFormatter.format(amount)}원`;
}

// HTML 요소를 만들고, 필요하면 CSS 클래스와 화면에 표시할 글자도 지정하는 공통 도우미입니다.
// textContent를 사용하므로 사용자 입력을 HTML 코드로 해석하지 않고 글자 그대로 표시합니다.
function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  // 클래스 이름이 전달된 경우에만 설정합니다. 빈 문자열이면 기본 클래스를 추가하지 않습니다.
  if (className) element.className = className;
  // text가 undefined가 아닐 때만 글자를 넣습니다. 빈 문자열은 유효한 표시값이므로 그대로 허용합니다.
  if (text !== undefined) element.textContent = text;
  return element;
}

// 페이지 상단의 안내 상자에 메시지를 넣거나, 빈 메시지일 때 상자를 숨깁니다.
function showNotice(message) {
  const notice = document.getElementById("notice");
  notice.textContent = message;
  // hidden=true이면 보이지 않고, 메시지가 있으면 hidden=false가 되어 화면에 나타납니다.
  notice.hidden = !message;
}

// 합계 영역의 네 값을 최신 구독 데이터로 다시 계산해 화면에 반영합니다.
function renderSummary(subscriptions, today) {
  // 계산 로직 파일에 있는 함수를 사용해 월 합계를 구합니다.
  const monthlyTotal = getTotalMonthlyAmount(subscriptions);
  // 오늘부터 7일 이내에 결제되는 구독만 계산 로직에서 골라옵니다.
  const dueSubscriptions = getSubscriptionsDueWithinDays(subscriptions, today, 7);
  // 이번 주 결제 예정액은 이번 주 대상 항목의 실제 결제 금액을 더한 값입니다.
  const dueTotal = dueSubscriptions.reduce((total, subscription) => {
    return total + subscription.amount;
  }, 0);

  // 각 HTML 요소의 글자만 교체합니다. HTML 구조 자체는 index.html에 그대로 둡니다.
  document.getElementById("monthly-total").textContent = formatWon(monthlyTotal);
  document.getElementById("annual-total").textContent = formatWon(getTotalAnnualAmount(subscriptions));
  document.getElementById("due-count").textContent = `${dueSubscriptions.length}건`;
  document.getElementById("due-total").textContent = `예정 금액 ${formatWon(dueTotal)}`;
  document.getElementById("subscription-count").textContent = `${subscriptions.length}개`;
}

// 구독 데이터 배열을 카드 목록으로 변환해 화면에 표시합니다.
function renderSubscriptions(subscriptions, today) {
  const list = document.getElementById("subscription-list");
  // 이전 렌더링 결과를 지웁니다. 그 다음 현재 배열만으로 카드를 새로 만듭니다.
  list.replaceChildren();

  // 목록이 비었다면 카드 대신 시작 안내를 표시하고, 아래 카드 생성은 실행하지 않습니다.
  if (subscriptions.length === 0) {
    list.append(makeElement("p", "empty-state", "아직 등록된 구독이 없어요.\n오른쪽에서 첫 구독을 추가해 보세요."));
    return;
  }

  // 배열에 들어 있는 구독 하나마다 화면 카드 한 장을 만듭니다.
  subscriptions.forEach((subscription) => {
    const card = makeElement("article", "subscription-card");
    const topLine = makeElement("div", "subscription-topline");
    // 서비스 이름과 카테고리를 카드의 윗줄에 추가합니다.
    topLine.append(
      makeElement("h3", "subscription-name", subscription.name),
      makeElement("span", "category-tag", subscription.category)
    );

    // 계산 로직으로 오늘부터 결제일까지 남은 날을 구해 사용자에게 읽기 쉬운 문구로 바꿉니다.
    const daysUntilPayment = getDaysUntilNextPayment(today, subscription.nextPaymentDate);
    let dueText = `D-${daysUntilPayment}`;
    // 날짜가 지났거나 오늘인 경우에는 "D--2"처럼 보이지 않도록 별도 문구를 씁니다.
    if (daysUntilPayment < 0) dueText = `결제일 ${Math.abs(daysUntilPayment)}일 지남`;
    if (daysUntilPayment === 0) dueText = "오늘 결제";

    // 금액과 주기는 같은 줄에 보여주며, 연간 구독도 실제 청구 금액 그대로 표시합니다.
    const bottomLine = makeElement("div", "subscription-bottomline");
    const amount = makeElement("p", "subscription-amount");
    amount.append(document.createTextNode(formatWon(subscription.amount)));
    amount.append(makeElement("span", "", subscription.cycle === "yearly" ? " / 매년" : " / 매월"));

    // 수정/삭제 버튼에는 동작 이름과 구독 ID를 저장합니다.
    // 목록 전체에 클릭 이벤트를 하나만 등록하는 이벤트 위임 방식에서 이 값을 읽습니다.
    const controls = makeElement("div", "card-controls");
    const dueBadge = makeElement("span", `due-badge${daysUntilPayment >= 0 && daysUntilPayment <= 7 ? " due-soon" : ""}`, dueText);
    const editButton = makeElement("button", "card-button", "수정");
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = subscription.id;
    editButton.setAttribute("aria-label", `${subscription.name} 수정`);
    const deleteButton = makeElement("button", "card-button delete-button", "삭제");
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = subscription.id;
    deleteButton.setAttribute("aria-label", `${subscription.name} 삭제`);
    controls.append(dueBadge, editButton, deleteButton);
    // 지금까지 만든 조각들을 올바른 순서로 카드에 조립한 뒤 목록에 붙입니다.
    bottomLine.append(amount, controls);
    card.append(topLine, bottomLine);
    list.append(card);
  });
}

// 카테고리별 월 지출과 전체 월 지출에서 각 카테고리의 비율을 계산해 막대로 그립니다.
function renderCategories(subscriptions) {
  const list = document.getElementById("category-list");
  list.replaceChildren();
  // 계산 로직은 연간 결제 금액도 월 기준으로 환산해 카테고리별로 합칩니다.
  const totals = getMonthlyAmountByCategory(subscriptions);
  const totalMonthlyAmount = getTotalMonthlyAmount(subscriptions);
  // 지출이 큰 카테고리를 위에 표시하기 위해 금액을 기준으로 내림차순 정렬합니다.
  const categories = Object.entries(totals).sort((first, second) => second[1] - first[1]);

  // 나눌 데이터가 없다면 0으로 나누지 않도록 안내 문구만 표시합니다.
  if (categories.length === 0 || totalMonthlyAmount === 0) {
    list.append(makeElement("p", "empty-state", "구독을 추가하면\n카테고리별 지출 비중을 보여드려요."));
    return;
  }

  // 정렬된 카테고리를 하나씩 막대 항목으로 바꿉니다.
  categories.forEach(([category, amount]) => {
    const item = makeElement("div", "category-item");
    const heading = makeElement("div", "category-heading");
    // 해당 카테고리 월 합계를 전체 월 합계로 나눈 비율입니다. 화면에는 정수 퍼센트로 보입니다.
    const percentage = Math.round((amount / totalMonthlyAmount) * 100);
    heading.append(
      makeElement("strong", "", category),
      makeElement("span", "", `${formatWon(amount)} · ${percentage}%`)
    );
    const track = makeElement("div", "category-track");
    // progressbar 속성은 스크린 리더가 막대의 의미와 현재 값을 읽을 수 있게 합니다.
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", `${category} 지출 비중`);
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(percentage));
    const bar = makeElement("div", "category-bar");
    // 계산한 퍼센트를 막대 너비로 적용합니다. 예: 25%이면 트랙의 4분의 1을 채웁니다.
    bar.style.width = `${percentage}%`;
    track.append(bar);
    item.append(heading, track);
    list.append(item);
  });
}

// 데이터 변경 후 화면의 세 부분을 모두 같은 시점의 데이터로 다시 그리는 시작점입니다.
function renderApp(subscriptions, today) {
  renderSummary(subscriptions, today);
  renderSubscriptions(subscriptions, today);
  renderCategories(subscriptions);
}
