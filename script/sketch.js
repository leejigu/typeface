const IDX_LIP_UPPER = 36;
const IDX_LIP_LOWER = 26;
const IDX_NOSE = 2;
const PITCH_COMPENSATION_DEGREES = -35;
// const editableDiv = document.getElementById('editable');
const editableDiv = document.querySelector('#editable > p');

// eyebrow, mouth 슬라이더 요소 가져오기
const eyebrowSlider = document.getElementById('eyebrow');
const mouthSlider = document.getElementById('mouth');

editableDiv.addEventListener('input', (event) => {
  let content = editableDiv.innerText;
  console.log(content)
  // 한글 입력 방지 (정규식을 이용)
  content = content.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '');
  // 영문 대문자로 변환
  content = content.toUpperCase();
  // 변경된 내용을 다시 삽입
  editableDiv.innerText = content;

  // 캐럿 위치를 마지막으로 이동
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(editableDiv);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
});

let faceMesh;
let video;
let faces = [];
let options = { maxFaces: 1, refineLandmarks: false, flipHorizontal: true };
let selIdx = 0;

function preload() {
  // Load the faceMesh model
  faceMesh = ml5.faceMesh(options);
}
function setup() {
   createCanvas(640, 480);  // 캔버스 크기 설정
  // 비디오 캡처 생성 후 비디오 요소를 화면에 숨깁니다.
  video = createCapture(VIDEO);
  // noCanvas(); // 캔버스를 생성하지 않음
  video.size(640, 480);
  video.hide(); // 비디오가 화면에 보이지 않게 합니다.

  // 얼굴 인식 시작
  faceMesh.detectStart(video, gotFaces);
}

function normalizeValue(value, min, max) {
  return Math.max(min, Math.min(max, value)); // min과 max 범위 내로 제한
}

function draw() {
  push();
  translate(video.width, 0); // 비디오를 반전시켜 표시
  scale(-1, 1); // 수평 뒤집기
  image(video, 0, 0, width, height);
  pop();

  // Draw all the tracked face points
  for (let i = 0; i < faces.length; i++) {
    let face = faces[i];
    for (let j = 0; j < face.keypoints.length; j++) {
      let keypoint = face.keypoints[j];
      fill(0, 255, 0);
      noStroke();
      circle(keypoint.x, keypoint.y, 2);
    }
  }

  if (faces.length > 0) {
    editableDiv.style.color = '#121212';
  } else {
    editableDiv.style.color = '#b1b1b1';
  }

  faces.forEach((face) => {
    const faceTrianglePoints = getFaceTrianglePoints(face);
    const dirVector = getDirectionVector(faceTrianglePoints);

    const eyesDist = getEyesDist(face);
    const lipsDist = getLipsDist(face);
    if (selIdx >= face.keypoints.length) selIdx = face.keypoints.length - 1;
    const selectedKeypoint = face.keypoints[selIdx];
    const eyeEyebrowDist = getEyeEyebrowDist(face);

    const leftEyeEyebrowDist = eyeEyebrowDist.leftDist;
    const rightEyeEyebrowDist = eyeEyebrowDist.rightDist;

    let avgEyeEyebrowDist = (leftEyeEyebrowDist + rightEyeEyebrowDist) / 2;

    // // 평균 거리에 따른 크기 계산
    // let AvgEyes = map(avgEyeEyebrowDist, 0, 50, 10, 9000); // 평균 거리 기반 크기

    let nomalizedAvgEyes = avgEyeEyebrowDist / eyesDist;

    stroke(0, 255, 0);
    line(
      width * 0.5,
      height * 0.5,
      width * 0.5 + dirVector.normal.x * 100,
      height * 0.5 + dirVector.normal.y * 100
    );
    drawFacebox(face.box);
    drawKeypointsEnds(face.leftEye);
    drawKeypointsEnds(face.rightEye);
    drawKeypointsEnds(face.leftEyebrow);
    drawKeypointsEnds(face.rightEyebrow);
    drawKeypointsMilestones(face.lips);
    drawKeypointsMilestones(face.leftEyebrow); // 왼쪽 눈썹 키포인트 그리기
    drawKeypointsMilestones(face.rightEyebrow); // 오른쪽 눈썹 키포인트 그리기
    drawKeypointsMilestones(face.leftEye); // 왼쪽 눈 키포인트 그리기
    drawKeypointsMilestones(face.rightEye); // 오른쪽 눈 키포인트 그리기

    drawBox(face.lips);

    noStroke();
    fill(0);
    text(`eyesDist: ${eyesDist.toFixed(2)}`, 16, 16);
    text(`pitch: ${degrees(dirVector.pitch).toFixed(2)}`, 16, 32);
    text(`yaw: ${degrees(dirVector.yaw).toFixed(2)}`, 16, 48);
    text(`roll: ${degrees(dirVector.roll).toFixed(2)}`, 16, 64);
    text(`lipsDist: ${lipsDist.toFixed(2)}`, 16, 80);
    text(
      `Left Eye-Eyebrow Dist: ${eyeEyebrowDist.leftDist.toFixed(2)}`,
      16,
      112
    );
    text(
      `Right Eye-Eyebrow Dist: ${eyeEyebrowDist.rightDist.toFixed(2)}`,
      16,
      128
    );
    fill(0, 255, 255);
    text(`lipsDist / eyesDist: ${(lipsDist / eyesDist).toFixed(2)}`, 16, 96);
    text(`nomalizedAvgEyes: ${nomalizedAvgEyes.toFixed(2)}`, 16, 142);

    circle(selectedKeypoint.x, selectedKeypoint.y, 5);


    let eyebrowrow = nomalizedAvgEyes;
    let mouthRaw = lipsDist / eyesDist;
    mouthRaw = map(mouthRaw, 0, 1.5, 10, 900);
    eyebrowrow = map(eyebrowrow, 0.8, 0.9, 10, 900);
    updateFontVariation(document.body, mouthRaw, eyebrowrow);

    // eyebrowrow와 mouthRaw 값을 슬라이더에 반영 (0에서 100까지의 범위로 조정)
    eyebrowSlider.value = normalizeValue(eyebrowrow, 0, 1000);
    mouthSlider.value = normalizeValue(mouthRaw, 0, 600);

    // 콘솔에 mouthRaw와 eyebrowrow 값 출력
    console.log('mouthRaw:', mouthRaw, 'eyebrowrow:', eyebrowrow);

    if (mouthRaw > 300) {
      editableDiv.style.color = '#00ff00';
    }
    // eyebrowrow가 800을 초과하면 글자색을 파랑으로 변경
    else if (eyebrowrow > 500) {
      editableDiv.style.color = '#0000ff';
    }
    // 기본 색상은 검정으로 유지
    else {
      editableDiv.style.color = '#121212';
    }
  });
}
//글자연결
function updateFontVariation(target, mouthRaw, eyebrowrow) {
  target.style.fontVariationSettings = `'wght' ${eyebrowrow}, 'wdth' ${mouthRaw}`;
  // 'wght'와 'wdth' 값에 따라 글자의 색상 조절
}

function getEyesDist(face) {
  const leftEye = face.leftEye;
  const rightEye = face.rightEye;
  const lastKpLeftEye = leftEye.keypoints[leftEye.keypoints.length - 1];
  const lastKpRightEye = rightEye.keypoints[rightEye.keypoints.length - 1];
  const eyesDist = dist(
    lastKpLeftEye.x,
    lastKpLeftEye.y,
    lastKpLeftEye.z,
    lastKpRightEye.x,
    lastKpRightEye.y,
    lastKpRightEye.z
  );
  return eyesDist;
}

function getFaceTrianglePoints(face) {
  const leftEye = face.leftEye;
  const rightEye = face.rightEye;
  const lastKpLeftEye = leftEye.keypoints[0];
  const lastKpRightEye = rightEye.keypoints[0];
  const noseKeypoint = face.keypoints[IDX_NOSE];
  return {
    eyeL: lastKpLeftEye,
    eyeR: lastKpRightEye,
    nose: noseKeypoint,
  };
}

function getLipsDist(face) {
  return dist(
    face.lips.keypoints[IDX_LIP_UPPER].x,
    face.lips.keypoints[IDX_LIP_UPPER].y,
    face.lips.keypoints[IDX_LIP_UPPER].z,
    face.lips.keypoints[IDX_LIP_LOWER].x,
    face.lips.keypoints[IDX_LIP_LOWER].y,
    face.lips.keypoints[IDX_LIP_LOWER].z
  );
}

function drawFacebox({ xMin, xMax, yMin, yMax }) {
  push();
  noFill();
  stroke(0, 255, 0);
  beginShape();
  vertex(xMin, yMin);
  vertex(xMax, yMin);
  vertex(xMax, yMax);
  vertex(xMin, yMax);
  endShape(CLOSE);
  pop();
}

function drawKeypointsEnds({ keypoints }) {
  const beginPoint = keypoints[0];
  const endPoint = keypoints[keypoints.length - 1];
  push();
  noStroke();
  fill(255, 0, 0);
  circle(beginPoint.x, beginPoint.y, 10);
  fill(0, 0, 255);
  circle(endPoint.x, endPoint.y, 10);
  pop();
}

function drawKeypointsMilestones({ keypoints }) {
  push();
  noStroke();
  textSize(8);
  for (let idx = 0; idx < keypoints.length; idx++) {
    const normal = idx / (keypoints.length - 1);
    fill(normal * 255, 0, (1 - normal) * 255);
    circle(keypoints[idx].x, keypoints[idx].y, 2);
    fill(255);
    text(idx, keypoints[idx].x, keypoints[idx].y);
  }
  pop();
}

function getEyeEyebrowDist(face) {
  // 왼쪽 눈과 왼쪽 눈썹의 마지막 키포인트
  const lastKpLeftEye =
    face.leftEye.keypoints[face.leftEye.keypoints.length - 1];
  const lastKpLeftEyebrow =
    face.leftEyebrow.keypoints[face.leftEyebrow.keypoints.length - 1];

  // 오른쪽 눈과 오른쪽 눈썹의 마지막 키포인트
  const lastKpRightEye =
    face.rightEye.keypoints[face.rightEye.keypoints.length - 1];
  const lastKpRightEyebrow =
    face.rightEyebrow.keypoints[face.rightEyebrow.keypoints.length - 1];

  // 왼쪽 눈과 눈썹 사이의 거리
  const leftDist = dist(
    lastKpLeftEye.x,
    lastKpLeftEye.y,
    lastKpLeftEye.z,
    lastKpLeftEyebrow.x,
    lastKpLeftEyebrow.y,
    lastKpLeftEyebrow.z
  );

  // 오른쪽 눈과 눈썹 사이의 거리
  const rightDist = dist(
    lastKpRightEye.x,
    lastKpRightEye.y,
    lastKpRightEye.z,
    lastKpRightEyebrow.x,
    lastKpRightEyebrow.y,
    lastKpRightEyebrow.z
  );

  return {
    leftDist: leftDist,
    rightDist: rightDist,
  };
}
function drawBox({ centerX, centerY, width, height }) {
  push();
  rectMode(CENTER);
  noFill();
  stroke(0, 255, 0);
  rect(centerX, centerY, width, height);
  pop();
}

function getDirectionVector({ eyeL, eyeR, nose }) {
  // 벡터 AB (eyeL -> eyeR)와 AC (eyeL -> nose) 구하기
  const AB = { x: eyeR.x - eyeL.x, y: eyeR.y - eyeL.y, z: eyeR.z - eyeL.z };
  const AC = { x: nose.x - eyeL.x, y: nose.y - eyeL.y, z: nose.z - eyeL.z };

  // 외적 계산 (법선 벡터 구하기)
  const normal = {
    x: AB.y * AC.z - AB.z * AC.y, // Nx
    y: AB.z * AC.x - AB.x * AC.z, // Ny
    z: AB.x * AC.y - AB.y * AC.x, // Nz
  };

  // 법선 벡터를 단위 벡터로 정규화
  const magnitude = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
  const unitNormal = {
    x: normal.x / magnitude,
    y: normal.y / magnitude,
    z: normal.z / magnitude,
  };

  // Yaw (좌우 회전 각도) 계산 - 정면을 향할 때 0
  const yaw =
    Math.atan2(-unitNormal.x, unitNormal.z) < 0
      ? Math.PI + Math.atan2(-unitNormal.x, unitNormal.z)
      : -Math.PI + Math.atan2(-unitNormal.x, unitNormal.z);

  // Pitch (위아래 회전 각도) 계산 - 정면을 향할 때 0
  let pitch =
    Math.atan2(-unitNormal.y, unitNormal.z) < 0
      ? -Math.PI - Math.atan2(-unitNormal.y, unitNormal.z)
      : Math.PI - Math.atan2(-unitNormal.y, unitNormal.z);
  // 화면 각도 등에 대한 보상
  pitch += radians(PITCH_COMPENSATION_DEGREES);

  // Roll (좌우 기울기 각도) 계산 - 정수리가 위를 향한 상태가 0
  const roll =
    -Math.atan2(AB.y, AB.x) < 0
      ? -Math.PI + Math.atan2(AB.y, AB.x)
      : Math.PI + Math.atan2(AB.y, AB.x);

  // 결과 반환
  return {
    normal: unitNormal,
    yaw: yaw, // 좌우 회전 각도
    pitch: pitch, // 위아래 회전 각도
    roll: roll, // 좌우 기울기 각도
  };
}

function mousePressed() {
  console.log(faces);
}

function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    selIdx--;
    if (selIdx < 0) selIdx = 0;
  } else if (keyCode === RIGHT_ARROW) {
    selIdx++;
  }
  console.log('selIdx', selIdx);
}

// Callback function for when faceMesh outputs data
function gotFaces(results) {
  // Save the output to the faces variable
  faces = results;
}
