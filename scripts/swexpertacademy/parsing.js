/**
 * 문제를 정상적으로 풀면 제출한 소스코드를 파싱하고, 로컬스토리지에 저장하는 함수입니다.
 */
async function parseCode() {
  const problemId = document.querySelector('div.problem_box > h3').innerText.replace(/\..*$/, '').trim();
  const contestProbId = [...document.querySelectorAll('#contestProbId')].slice(-1)[0].value;
  updateTextSourceEvent();
  const code = document.querySelector('#textSource').value;
  await updateProblemData(problemId, { code, contestProbId });
  return { problemId, contestProbId };
}

/*
  cEditor 소스코드의 정보를 textSource에 저장하도록 하는 함수 입니다. 
*/
function updateTextSourceEvent() {
  document.documentElement.setAttribute('onreset', 'cEditor.save();');
  document.documentElement.dispatchEvent(new CustomEvent('reset'));
  document.documentElement.removeAttribute('onreset');
}

/*
  문제 요약과 코드를 파싱합니다.
  - directory : 레포에 기록될 폴더명
  - message : 커밋 메시지
  - fileName : 파일명
  - readme : README.md에 작성할 내용
  - code : 소스코드 내용
*/
async function parseData() {
  const nickname = document.querySelector('#searchinput').value;

  log('사용자 로그인 정보 및 유무 체크', nickname, document.querySelector('#problemForm div.info'));
  // 검색하는 유저 정보와 로그인한 유저의 닉네임이 같은지 체크
  // PASS를 맞은 기록 유무 체크
  if (getNickname() !== nickname) return;
  if (isNull(document.querySelector('#problemForm div.info'))) return;

  log('결과 데이터 파싱 시작');

  const title = document
    .querySelector('div.problem_box > p.problem_title')
    .innerText.replace(/ D[0-9]$/, '')
    .replace(/^[^.]*/, '')
    .substr(1)
    .trim();
  // 레벨
  const level = document.querySelector('div.problem_box > p.problem_title > span.badge')?.textContent || 'Unrated';
  // 문제번호
  const problemId = document.querySelector('body > div.container > div.container.sub > div > div.problem_box > p').innerText.split('.')[0].trim();
  // 문제 콘테스트 인덱스
  const contestProbId = [...document.querySelectorAll('#contestProbId')].slice(-1)[0].value;
  // 문제 링크
  const link = `${window.location.origin}/main/code/problem/problemDetail.do?contestProbId=${contestProbId}`;

  // 문제 언어, 메모리, 시간소요
  const language = document.querySelector('#problemForm div.info > ul > li:nth-child(1) > span:nth-child(1)').textContent.trim();
  const memory = document.querySelector('#problemForm div.info > ul > li:nth-child(2) > span:nth-child(1)').textContent.trim().toUpperCase();
  const runtime = document.querySelector('#problemForm div.info > ul > li:nth-child(3) > span:nth-child(1)').textContent.trim();
  const length = document.querySelector('#problemForm div.info > ul > li:nth-child(4) > span:nth-child(1)').textContent.trim();

  // 확장자명
  const extension = languages[language.toLowerCase()];

  // 제출날짜
  const submissionTime = document.querySelector('.smt_txt > dd').textContent.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g)[0];
  // 로컬스토리지에서 기존 코드에 대한 정보를 불러올 수 없다면 코드 디테일 창으로 이동 후 제출하도록 이동
  const data = await getProblemData(problemId);
  log('data', data);
  if (isNull(data?.code)) {
    // 기존 문제 데이터를 로컬스토리지에 저장하고 코드 보기 페이지로 이동
    // await updateProblemData(problemId, { level, contestProbId, link, language, memory, runtime, length, extension });
    // const contestHistoryId = document.querySelector('div.box-list > div > div > span > a').href.replace(/^.*'(.*)'.*$/, '$1');
    // window.location.href = `${window.location.origin}/main/solvingProblem/solvingProblem.do?contestProbId=${contestProbId}`;
    console.error('소스코드 데이터가 없습니다.');
    return;
  }
  const code = data.code;
  log('파싱 완료');
  // eslint-disable-next-line consistent-return
  return makeData({ link, problemId, level, title, extension, code, runtime, memory, length, submissionTime, language });
}

async function makeData(origin) {
  const { link, problemId, level, extension, title, runtime, memory, code, length, submissionTime, language } = origin;
  /*
  * SWEA의 경우에는 JAVA 같이 모두 대문자인 경우가 존재합니다. 하지만 타 플랫폼들(백준, 프로그래머스)는 첫문자가 모두 대문자로 시작합니다.
  * 그래서 이와 같은 케이스를 처리를 위해 첫문자만 대문자를 유지하고 나머지 문자는 소문자로 변환합니다.
  * C++ 같은 경우에는 문자가 그대로 유지됩니다.
  * */
  const lang = (language === language.toUpperCase()) ? language.substring(0, 1) + language.substring(1).toLowerCase() : language
  const directory = await getDirNameByOrgOption(`SWEA/src/SWEA/${level}`, lang);

  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const currentMonth = months[new Date().getMonth()];
  const message = `[${currentMonth}/SWEA] ${problemId} ${title}`;
  
  const fileName = `SWEA_${problemId}.${extension}`;
  const dateInfo = submissionTime ?? getDateString(new Date(Date.now()));

  const prBody = `
  # 🧩 알고리즘 문제 풀이
  ## 📝 문제 정보
  - **플랫폼:** SW Expert Academy (SWEA)
  - **문제 이름:** ${problemId} ${title}
  - **문제 링크:** ${link}
  - **난이도:** ${level}
  - **알고리즘 유형:** #알고리즘유형#
  - **제출 일자:** ${dateInfo}

  ## 💡 문제 설명
  ※ 직접 작성하세요.

  ## ⏱️ 성능 요약
  ### 메모리
  ${memory}
  ### 시간
  ${runtime}
  ### 코드길이
  ${length} Bytes

  ## 🤔 접근 방법
  #접근방법#

  ## 🤯 어려웠던 점
  #어려웠던점#

  ## 📚 배운 점
  #배운점#

  ## ✅ 자가 체크리스트
  - [ ] 코드가 모든 테스트 케이스를 통과하나요?
  - [ ] 코드에 주석을 충분히 달았나요?


  > 출처: SW Expert Academy, https://swexpertacademy.com/main/code/problem/problemList.do
  `;

  let modifiedCode = code;

  // Java 파일일 경우, 파일명에 맞춰 클래스명 변경
  if (extension === 'java') {
    let newClassName = `SWEA_${problemId}`;
    modifiedCode = code.replace(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/, `public class ${newClassName}`);
  }

  // 패키지 추가
  let finalCode = modifiedCode;
  if (extension === 'java') {
    const packageName = `package SWEA.${level};`;
    finalCode = `${packageName}\n\n${modifiedCode}`;
  }

  return { 
    problemId, 
    directory, 
    message, 
    fileName, 
    prBody, 
    code: finalCode 
  };
}
