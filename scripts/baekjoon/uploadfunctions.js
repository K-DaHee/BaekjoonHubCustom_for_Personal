/**
 * Github에 풀 리퀘스트 생성하여 문제 풀이 코드 업로드
 * @param {object} bojData - 문제 풀이와 관련된 데이터 객체
 * @param {string} bojData.code - 소스 코드
 * @param {string} bojData.directory - 파일이 저장될 Git 저장소 내의 경로
 * @param {string} bojData.fileName - 파일명
 * @param {string} bojData.message - 커밋 메시지
 * @param {string} bojData.prBody - Pull Request 본문에 들어갈 내용
 * @param {function} cb - 업로드 완료 후 실행될 콜백 함수
 */
async function uploadOneSolveProblemOnGit(bojData, cb) {
  const token = await getToken();
  const hook = await getHook();
  if (isNull(token) || isNull(hook)) {
    console.error('token or hook is null', token, hook);
    return;
  }
  
  // 새로운 브랜치 생성
  const { newBranchName } = await createBranchAndCommit(hook, token, bojData.code, bojData.directory, bojData.fileName, bojData.message);
    
  if (newBranchName) {
    // 생성된 브랜치 기반으로 PR 생성
    const pullRequest = await createPullRequestFromBranch(hook, token, bojData.prBody, bojData.message, newBranchName);
    console.log(`Pull Request가 성공적으로 생성되었습니다: ${pullRequest.html_url}`);
    
    if (typeof cb === 'function') {
      cb(pullRequest.html_url);
    }
  }
}

/**
 * Github api를 사용하여 업로드
 * @see https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
 * @param {string} token - github api 토큰
 * @param {string} hook - github api hook
 * @param {string} sourceText - 업로드할 소스코드 내용
 * @param {string} readmeText - 업로드할 README 내용
 * @param {string} directory - 업로드될 파일의 경로
 * @param {string} filename - 업로드할 파일명
 * @param {string} commitMessage - 커밋 메시지 (예: "[OCT/플랫폼] 1000 Helloworld")
 * @param {function} cb - 콜백 함수 (ex. 업로드 후 로딩 아이콘 처리 등)
 */
async function createBranchAndCommit(hook, token, sourceText, directory, filename, commitMessage) {
  const git = new GitHub(hook, token);
  const stats = await getStats();
  let baseBranch = stats.branches[hook] || await git.getDefaultBranchOnRepo();
  stats.branches[hook] = baseBranch;
  
  // 베이스 브랜치의 최신 '커밋' SHA와 '트리' SHA 가져옴
  const { refSHA: baseBranchSHA } = await git.getReference(baseBranch);
  const { treeSHA: baseTreeSHA } = await git.getCommit(baseBranchSHA);

  // 커밋 메시지에서 플랫폼 정보 추출
  const platform = commitMessage.substring(commitMessage.indexOf('/') + 1, commitMessage.indexOf(']'));
  
  // 새 브랜치 생성
  const newBranchName = `${platform}/problem-${filename.replace(/[^0-9]/g, '')}`;
  const newBranchRef = `refs/heads/${newBranchName}`;
  await git.createReference(newBranchRef, baseBranchSHA);

  // 파일 Blob 생성 및 새 Tree 생성
  const source = await git.createBlob(sourceText, `${directory}/${filename}`);
  const newTreeSHA = await git.createTree(baseTreeSHA, [source]);

  // 새 커밋 생성 및 브랜치 Head 업데이트
  const commitSHA = await git.createCommit(commitMessage, newTreeSHA, baseBranchSHA);
  await git.updateHead(newBranchRef, commitSHA);

  console.log(`성공: '${newBranchName}' 브랜치에 커밋이 완료되었습니다.`);
  return { newBranchName };
}

/**
 * 브랜치 기반으로 Pull Request 생성
 * @param {string} newBranchName - PR을 보낼 브랜치 이름 (e.g., "플랫폼/problem-1001")
 * @returns {Promise<object>} 생성된 Pull Request 객체
 */
async function createPullRequestFromBranch(hook, token, prBody, commitMessage, newBranchName) {
  const git = new GitHub(hook, token);
  const stats = await getStats();
  const baseBranch = stats.branches[hook];

  // PR 제목 생성 => 커밋 메세지를 이미 수정해뒀기 때문에 동일하게 지정
  const prTitle = commitMessage;

  // PR 생성 API 호출
  return git.createPullRequest(prTitle, prBody, newBranchName, baseBranch);
}