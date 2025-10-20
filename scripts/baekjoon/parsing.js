/*
  문제가 맞았다면 문제 관련 데이터를 파싱하는 함수의 모음입니다.
  모든 해당 파일의 모든 함수는 findData()를 통해 호출됩니다.
*/

/*
  bojData를 초기화하는 함수로 문제 요약과 코드를 파싱합니다.

  - 문제 설명: problemDescription
  - Github repo에 저장될 디렉토리: directory
  - 커밋 메시지: message 
  - 백준 문제 카테고리: category
  - 파일명: fileName
  - Readme 내용 : readme
*/
async function findData(data) {
  try {
    if (isNull(data)) {
      let table = findFromResultTable();
      if (isEmpty(table)) return null;
      table = filter(table, {
        'resultCategory': RESULT_CATEGORY.RESULT_ACCEPTED,
        'username': findUsername(),
        'language': table[0]["language"]
      })
      data = selectBestSubmissionList(table)[0];
    }
    if (isNaN(Number(data.problemId)) || Number(data.problemId) < 1000) throw new Error(`정책상 대회 문제는 업로드 되지 않습니다. 대회 문제가 아니라고 판단된다면 이슈로 남겨주시길 바랍니다.\n문제 ID: ${data.problemId}`);
    data = { ...data, ...await findProblemInfoAndSubmissionCode(data.problemId, data.submissionId) };
    const detail = await makeDetailMessageAndReadme(preProcessEmptyObj(data));
    return { ...data, ...detail }; // detail 만 반환해도 되나, 확장성을 위해 모든 데이터를 반환합니다.
  } catch (error) {
    console.error(error);
  }
  return null;
}
 
/**
 * 문제의 상세 정보를 가지고, 문제의 업로드할 디렉토리, 파일명, 커밋 메시지, 문제 설명을 파싱하여 반환합니다.
 * @param {Object} data
 * @returns {Object} { directory, fileName, message, readme, code }
 */
async function makeDetailMessageAndReadme(data) {
  const { problemId, submissionId, result, title, level, problem_tags,
    problem_description, problem_input, problem_output, submissionTime,
    code, language, memory, runtime } = data;
  const score = parseNumberFromString(result);
  // level 변수(예: "Bronze II")를 분리
  const levelParts = level.split(' ');
  const tier = levelParts[0].toLowerCase(); // "bronze"
  const rankStr = levelParts[1]; // "II"

  // 로마 숫자나 아라비아 숫자를 두 자리 숫자로 변환 (예: "II" -> "02")
  const romanMap = { 'V': 5, 'IV': 4, 'III': 3, 'II': 2, 'I': 1 };
  const rankNum = romanMap[rankStr] || parseInt(rankStr, 10);
  const formattedRank = String(rankNum).padStart(2, '0'); // "02", "05" 등
  const tierWithRank = `${tier}${formattedRank}`;

  // 최종 디렉토리 경로 조합
  const directory = await getDirNameByOrgOption(
    `Baekjoon/src/BOJ/${tier}/${tierWithRank}`,
    langVersionRemove(language, null)
  );
  
  // Commit Message [월/BOJ] 문제번호 문제이름
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const currentMonth = months[new Date().getMonth()];
  const message = `[${currentMonth}/BOJ] ${problemId} ${title}`;

  const category = problem_tags.join(', ');
  const fileName = `BOJ_${problemId}.${languages[language]}`;
  const dateInfo = submissionTime ?? getDateString(new Date(Date.now()));
  
  const clean_input = problem_input.replace(/<[^>]*>?/gm, '').trim();
  const clean_output = problem_output.replace(/<[^>]*>?/gm, '').trim();

  const prBody = `
  # 🧩 알고리즘 문제 풀이
  ## 📝 문제 정보
  - **플랫폼:** 백준 (BOJ)
  - **문제 이름:** ${problemId} ${title}
  - **문제 링크:** https://www.acmicpc.net/problem/${problemId}
  - **난이도:** ${level}
  - **알고리즘 유형:** ${category || "분류 정보 없음"}
  - **제출 일자:** ${dateInfo}

  ## 💡 문제 설명
  ${problem_description}

  ### 입력
  ${clean_input}

  ### 출력
  ${clean_output}

  ## ⏱️ 성능 요약
  ### 메모리
  ${memory} KB
  ### 시간
  ${runtime} ms

  ## 🤔 접근 방법
  #접근방법#

  ## 🤯 어려웠던 점
  #어려웠던점#

  ## 📚 배운 점
  #배운점#

  ## ✅ 자가 체크리스트
  - [ ] 코드가 모든 테스트 케이스를 통과하나요?
  - [ ] 코드에 주석을 충분히 달았나요?
  

  > 출처: Baekjoon Online Judge, https://www.acmicpc.net/problemset
  `;

  let modifiedCode = code;

  // Java 파일일 경우, 파일명에 맞춰 클래스명 변경
  const extension = languages[language];
  if (extension === 'java') {
    const newClassName = `BOJ_${problemId}`;
    modifiedCode = code.replace(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/, `public class ${newClassName}`);
  }

  // 패키지 선언문 추가
  let finalCode = modifiedCode;
  if (extension === 'java') {
    const packageName = `package BOJ.${tier}.${tierWithRank};`;
    finalCode = `${packageName}\n\n${modifiedCode}`;
  }

  return {
    directory,
    fileName,
    message,
    prBody,
    code: finalCode
  };
}

/*
  현재 로그인된 유저를 파싱합니다.
*/
function findUsername() {
  const el = document.querySelector('a.username');
  if (isNull(el)) return null;
  const username = el?.innerText?.trim();
  if (isEmpty(username)) return null;
  return username;
}

/*
  유저 정보 페이지에서 유저 이름을 파싱합니다.
*/
function findUsernameOnUserInfoPage() {
  const el = document.querySelector('div.page-header > h1');
  if (isNull(el)) return null;
  const username = el.textContent.trim();
  if (isEmpty(username)) return null;
  return username;
}

/*
  결과 테이블의 존재 여부를 확인합니다.
*/
function isExistResultTable() {
  return document.getElementById('status-table') !== null;
}

/*
  결과 테이블을 파싱하는 함수입니다.
*/
function parsingResultTableList(doc) {
  const table = doc.getElementById('status-table');
  if (table === null || table === undefined || table.length === 0) return [];
  const headers = Array.from(table.rows[0].cells, (x) => convertResultTableHeader(x.innerText.trim()));

  const list = [];
  for (let i = 1; i < table.rows.length; i++) {
    const row = table.rows[i];
    const cells = Array.from(row.cells, (x, index) => {
      switch (headers[index]) {
        case 'result':
          return { result: x.innerText.trim(), resultCategory: x.firstChild.getAttribute('data-color').replace('-eng', '').trim() };
        case 'language':
          return x.innerText.unescapeHtml().replace(/\/.*$/g, '').trim();
        case 'submissionTime':
          const el = x.querySelector('a.show-date');
          if (isNull(el)) return null;
          return el.getAttribute('data-original-title');
        case 'problemId':
          const a = x.querySelector('a.problem_title');
          if (isNull(a)) return null;
          return {
            problemId: a.getAttribute('href').replace(/^.*\/([0-9]+)$/, '$1'),
          };
        default:
          return x.innerText.trim();
      }
    });
    let obj = {};
    obj.elementId = row.id;
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = cells[j];
    }
    obj = { ...obj, ...obj.result, ...obj.problemId};
    list.push(obj);
  }
  log('TableList', list);
  return list;
}

/*
  제출 화면의 데이터를 파싱하는 함수로 다음 데이터를 확인합니다.
    - 유저이름: username
    - 실행결과: result
    - 메모리: memory
    - 실행시간: runtime
    - 제출언어: language
    - 제출시간: submissionTime
    - 제출번호: submissionId
    - 문제번호: problemId
    - 해당html요소 : element
*/
function findFromResultTable() {
  if (!isExistResultTable()) {
    log('Result table not found');
  }
  return parsingResultTableList(document);
}

/*
  Fetch를 사용하여 정보를 구하는 함수로 다음 정보를 확인합니다.

    - 문제 설명: problem_description
    - 문제 입력값: problem_input
    - 문제 출력값: problem_output
    - 제출 코드: code
    - 문제 제목: title
    - 문제 등급: level 
    - Github repo에 저장될 디렉토리: directory
    - 커밋 메시지: message 
    - 백준 문제 카테고리: category
*/
function parseProblemDescription(doc = document) {
  convertImageTagAbsoluteURL(doc.getElementById('problem_description')); //이미지에 상대 경로가 있을 수 있으므로 이미지 경로를 절대 경로로 전환 합니다.
  const problemId = doc.getElementsByTagName('title')[0].textContent.split(':')[0].replace(/[^0-9]/, '');
  const problem_description = unescapeHtml(doc.getElementById('problem_description').innerHTML.trim());
  const problem_input = doc.getElementById('problem_input')?.innerHTML.trim?.().unescapeHtml?.() || 'Empty'; // eslint-disable-line
  const problem_output = doc.getElementById('problem_output')?.innerHTML.trim?.().unescapeHtml?.() || 'Empty'; // eslint-disable-line
  if (problemId && problem_description) {
    log(`문제번호 ${problemId}의 내용을 저장합니다.`);
    updateProblemsFromStats({ problemId, problem_description, problem_input, problem_output});
    return { problemId, problem_description, problem_input, problem_output};
  }
  return {};
}

async function fetchProblemDescriptionById(problemId) {
  return fetch(`https://www.acmicpc.net/problem/${problemId}`)
    .then((res) => res.text())
    .then((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return parseProblemDescription(doc);
    });
}

async function fetchSubmitCodeById(submissionId) {
  return fetch(`https://www.acmicpc.net/source/download/${submissionId}`, { method: 'GET' })
    .then((res) => res.text())
}

async function fetchSolvedACById(problemId) {
  return chrome.runtime.sendMessage({sender: "baekjoon", task : "SolvedApiCall", problemId : problemId});
}

async function getProblemDescriptionById(problemId) {
  let problem = await getProblemFromStats(problemId);
  if (isNull(problem)) {
    problem = await fetchProblemDescriptionById(problemId);
    updateProblemsFromStats(problem); // not await
  }
  return problem;
}

async function getSubmitCodeById(submissionId) {
  let code = await getSubmitCodeFromStats(submissionId);
  if (isNull(code)) {
    code = await fetchSubmitCodeById(submissionId);
    updateSubmitCodeFromStats({ submissionId, code }); // not await
  }
  return code;
}

async function getSolvedACById(problemId) {
  let jsonData = await getSolvedACFromStats(problemId);
  if (isNull(jsonData)) {
    jsonData = await fetchSolvedACById(problemId);
    updateSolvedACFromStats({ problemId, jsonData }); // not await
  }
  return jsonData;
}

/**
 * 제출 소스코드, 문제 설명, 예시 입력, 예시 출력, 문제 태그를 반환합니다.
 * @param {Object} problemId
 * @param {Object} submissionId
 * @returns {Object} { problemId, submissionId, code, problem_description, problem_input, problem_output, problem_tags }
 */
async function findProblemInfoAndSubmissionCode(problemId, submissionId) {
  log('in find with promise');
  if (!isNull(problemId) && !isNull(submissionId)) {
    return Promise.all([getProblemDescriptionById(problemId), getSubmitCodeById(submissionId), getSolvedACById(problemId)])
      .then(([description, code, solvedJson]) => {
        const problem_tags = solvedJson.tags.flatMap((tag) => tag.displayNames).filter((tag) => tag.language === 'ko').map((tag) => tag.name);
        const title = solvedJson.titleKo;
        const level = bj_level[solvedJson.level];

        const { problem_description, problem_input, problem_output } = description;
        return { problemId, submissionId, title, level, code, problem_description, problem_input, problem_output, problem_tags };
      })
      .catch((err) => {
        console.log('error ocurred: ', err);
        uploadState.uploading = false;
        markUploadFailedCSS();
      });
  }
}

/**
 * 문제의 목록을 문제 번호로 한꺼번에 반환합니다.
 * (한번 조회 시 100개씩 나눠서 진행)
 * @param {Array} problemIds
 * @returns {Promise<Array>}
 */

async function fetchProblemInfoByIds(problemIds) {
  const dividedProblemIds = [];
  for (let i = 0; i < problemIds.length; i += 100) {
    dividedProblemIds.push(problemIds.slice(i, i + 100));
  }
  return asyncPool(1, dividedProblemIds, async (pids) => {
    const result = await fetch(`https://solved.ac/api/v3/problem/lookup?problemIds=${pids.join('%2C')}`, { method: 'GET' });
    return result.json();
  }).then(results => results.flatMap(result => result));
}

/**
 * 문제의 상세 정보 목록을 문제 번호 목록으로 한꺼번에 반환합니다.
 * (한번 조회 시 2개씩 병렬로 진행)
 * @param {Array} problemIds
 * @returns {Promise<Array>}
 */
async function fetchProblemDescriptionsByIds(problemIds) {
  return asyncPool(2, problemIds, async (problemId) => {
    return getProblemDescriptionById(problemId);
  })
}

/**
 * submissionId들을 통해 코드들을 가져옵니다. (부하를 줄이기 위해 한번에 2개씩 가져옵니다.)
 * @param {Array} submissionIds
 * @returns {Promise<Array>}
 */
async function fetchSubmissionCodeByIds(submissionIds) {
  return asyncPool(2, submissionIds, async (submissionId) => {
    return getSubmitCodeById(submissionId);
  });
}



/**
 * user가 problemId 에 제출한 리스트를 가져오는 함수
 * @param problemId: 문제 번호
 * @param username: 백준 아이디
 * @return Promise<Array<String>>
 */
async function findResultTableByProblemIdAndUsername(problemId, username) {
  return fetch(`https://www.acmicpc.net/status?from_mine=1&problem_id=${problemId}&user_id=${username}`, { method: 'GET' })
    .then((html) => html.text())
    .then((text) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      return parsingResultTableList(doc);
    });
}

/**
 * user가 "맞았습니다!!" 결과를 맞은 중복되지 않은 제출 결과 리스트를 가져오는 함수
 * @param username: 백준 아이디
 * @returns Promise<Array<Object>>
 */
async function findUniqueResultTableListByUsername(username) {
  return selectBestSubmissionList(await findResultTableListByUsername(username));
}

/**
 * user가 "맞았습니다!!" 결과를 맞은 모든 제출 결과 리스트를 가져오는 함수
 * @param username: 백준 아이디
 * @return Promise<Array<Object>>
 */
async function findResultTableListByUsername(username) {
  const result = [];
  let doc = await findHtmlDocumentByUrl(`https://www.acmicpc.net/status?user_id=${username}&result_id=4`);
  let next_page = doc.getElementById('next_page');
  do {
    result.push(...parsingResultTableList(doc));
    if (next_page !== null) doc = await findHtmlDocumentByUrl(next_page.getAttribute('href'));
  } while ((next_page = doc.getElementById('next_page')) !== null);
  result.push(...parsingResultTableList(doc));

  return result;
}

/**
 * url에 해당하는 html 문서를 가져오는 함수
 * @param url: url 주소
 * @returns html document
 */
async function findHtmlDocumentByUrl(url) {
  return fetch(url, { method: 'GET' })
    .then((html) => html.text())
    .then((text) => {
      const parser = new DOMParser();
      return parser.parseFromString(text, 'text/html');
    });
}

/**
 * 백준에서 표기된 프로그래밍 언어의 버전을 없애고 업로드 하기 위함입니다.
 * 버전에 차이가 중요하게 여겨진다면, 'ignore'에 예외 케이스를 추가하세요.
 * 해당 코드는 'lang'이 "PyPy3" 같이 주어진다면은 버전을 제거하지 않습니다.
 * 예외에 추가 되어있거나, "Python 3.8" 혹은 "Java 11" 같이 주어진다면 버전이 제거될것입니다.
 * @param {string} lang - 처리 하고자 하는 언어입니다.
 * @param {Set} ignores - 예외 처리 하고자 하는 언어를 추가 해주세요.
 * @return {string} - 분기 처리에 따른 lang
 *  */
function langVersionRemove(lang, ignores) {
  if (ignores === null || !ignores.has(lang)) {
    let parts = lang.split(' ');
    if (/^\d/.test(parts[parts.length - 1])) {
      parts.pop();
    }
    lang = parts.join(' ');
  }

  return lang;
}
