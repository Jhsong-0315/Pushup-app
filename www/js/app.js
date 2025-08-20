/**
 * 푸쉬업 챌린지 앱 메인 JavaScript
 * 작성일: 2025년 8월
 * 개선사항: 상수 관리 적용, 데이터 모듈 분리 (엔진과 설계도 분리)
 */

// 코스 데이터 모듈 import (엔진과 분리된 설계도)
import { courseData, COURSE_DESCRIPTIONS } from './course.js';

// ==============================================
// 상수 정의 (마법의 문자열 제거)
// ==============================================
const PAGE_IDS = {
    HOME: 'courseListPage',
    CALENDAR: 'calendarPage',
    COUNTER: 'counterPage',
    COURSE_DETAIL: 'courseDetailPage'
};

const WORKOUT_STATES = {
    READY: '준비됨',
    PREPARING: '준비...',
    DOWN_PHASE: '⬇️ 내려가기',
    UP_PHASE: '⬆️ 올라가기',
    PAUSED: '일시 정지됨',
    COMPLETED: '코스 완료! 🎉'
};

const BUTTON_TEXTS = {
    START_WORKOUT: '운동 시작',
    RESUME_WORKOUT: '운동 재개',
    PAUSE_WORKOUT: '일시 정지',
    RESET_WORKOUT: '코스 포기',
    END_SESSION: '운동 종료'
};

const DISPLAY_STYLES = {
    SHOW: 'inline-block',
    HIDE: 'none',
    FLEX: 'flex',
    BLOCK: 'block'
};

const WORKOUT_COURSE = {
    FREE_COURSE: '자유 코스',
    FREE_COURSE_SETUP: '자유 코스 설정'
};

const STORAGE_KEYS = {
    HISTORY: 'pushupAppHistory'
};

const SOUND_FREQUENCIES = {
    DOWN: 600,
    UP: 1000
};

// ==============================================
// 전역 변수들
// ==============================================
let count = 0, seconds = 0, minutes = 0;
let timerInterval = null, isTimerRunning = false;
let dailyTotalPushups = 0, dailySets = 0, dailySessionHistory = [];
let workoutInterval = null, isWorkoutRunning = false, currentBeep = 0;
let beepInterval = 4;
let audioContext = null, countdownInterval = null;
let currentWorkout = null;
let calendarDate = new Date();
let freeCourseSets = [10, 10, 10];

// ==============================================
// DOM 요소들 캐싱
// ==============================================
const dom = {
    counter: document.getElementById('counter'),
    timer: document.getElementById('timer'),
    stopTimerBtn: document.getElementById('stopTimer'),
    resetBtn: document.getElementById('resetBtn'),
    totalPushups: document.getElementById('totalPushups'),
    totalTime: document.getElementById('totalTime'),
    totalSets: document.getElementById('totalSets'),
    startWorkoutBtn: document.getElementById('startWorkoutBtn'),
    currentPhase: document.getElementById('currentPhase'),
    progressInfo: document.getElementById('progressInfo'),
    setInfo: document.getElementById('setInfo'),
    repInfo: document.getElementById('repInfo'),
    endSessionBtn: document.getElementById('endSessionBtn'),
    resultsModal: document.getElementById('resultsModal'),
    resultsTableBody: document.querySelector('#resultsTable tbody'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    currentMonthEl: document.getElementById('currentMonth'),
    calendarGrid: document.querySelector('.calendar-grid'),
    prevMonthBtn: document.getElementById('prevMonthBtn'),
    nextMonthBtn: document.getElementById('nextMonthBtn'),
    recordDetails: document.getElementById('recordDetails'),
    navBtns: document.querySelectorAll('.nav-btn'),
    courseListContainer: document.getElementById('courseListContainer'),
    courseDetailPage: document.getElementById('courseDetailPage'),
    courseDetailTitle: document.getElementById('courseDetailTitle'),
    courseDetailContainer: document.getElementById('courseDetailContainer'),
    dailyStats: document.getElementById('dailyStats'),
    preWorkoutModal: document.getElementById('preWorkoutModal'),
    preWorkoutTitle: document.getElementById('preWorkoutTitle'),
    workoutGoal: document.getElementById('workoutGoal'),
    beepIntervalInput: document.getElementById('beepIntervalInput'),
    preWorkoutStartBtn: document.getElementById('preWorkoutStartBtn'),
    deleteConfirmModal: document.getElementById('deleteConfirmModal'),
    deleteConfirmText: document.getElementById('deleteConfirmText'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    freeCourseSetup: document.getElementById('freeCourseSetup'),
    workoutDisplay: document.getElementById('workoutDisplay'),
    setListContainer: document.getElementById('setListContainer'),
    addSetBtn: document.getElementById('addSetBtn'),
    removeSetBtn: document.getElementById('removeSetBtn'),
    beepIntervalInputFree: document.getElementById('beepIntervalInputFree'),
    counterPageTitle: document.getElementById('counterPageTitle')
};

// ==============================================
// 유틸리티 함수들
// ==============================================
function getFormattedKey(date) { 
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0'); 
    return `${y}-${m}-${d}`; 
}

function updateTimer() {
    seconds++;
    if (seconds >= 60) {
        seconds = 0;
        minutes++;
    }
    const displayMinutes = String(minutes).padStart(2, '0');
    const displaySeconds = String(seconds).padStart(2, '0');
    dom.timer.textContent = `${displayMinutes}:${displaySeconds}`;
    dom.totalTime.textContent = `${minutes}분 ${seconds}초`;
}

function playBeep(frequency = 800, duration = 200) {
    if (!audioContext) { 
        try { 
            audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
        } catch (e) { 
            console.error("Web Audio API not supported"); 
            return; 
        } 
    }
    const oscillator = audioContext.createOscillator(); 
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode); 
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); 
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); 
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    oscillator.start(audioContext.currentTime); 
    oscillator.stop(audioContext.currentTime + duration / 1000);
}

// ==============================================
// 데이터 관리 함수들
// ==============================================
function loadData() {
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || {};
    const todayKey = getFormattedKey(new Date());
    const todayData = allData[todayKey] || { totalPushups: 0, totalSets: 0, sessionHistory: [] };
    dailyTotalPushups = todayData.totalPushups;
    dailySets = todayData.totalSets;
    dailySessionHistory = todayData.sessionHistory;
    updateStatsUI();
}

function saveData() {
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || {};
    const todayKey = getFormattedKey(new Date());
    allData[todayKey] = { 
        totalPushups: dailyTotalPushups, 
        totalSets: dailySets, 
        sessionHistory: dailySessionHistory 
    };
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(allData));
}

function updateStatsUI() { 
    dom.totalPushups.textContent = `${dailyTotalPushups}개`; 
    dom.totalSets.textContent = `${dailySets}세트`; 
}

// ==============================================
// 운동 관련 함수들
// ==============================================
function startCountdown(onComplete) {
    dom.currentPhase.textContent = WORKOUT_STATES.PREPARING;
    let countdown = 3;
    countdownInterval = setInterval(() => {
        dom.currentPhase.textContent = `${countdown}`;
        countdown--;
        if (countdown < 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            if (onComplete) onComplete();
        }
    }, 1000);
}

function clearAllIntervals() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    if (workoutInterval) {
        clearInterval(workoutInterval);
        workoutInterval = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isWorkoutRunning = false;
    isTimerRunning = false;
}

function updateProgressUI() {
    if (!currentWorkout) {
        dom.setInfo.innerHTML = `<span>세트 0 / 0</span>`;
        dom.repInfo.innerHTML = `<span>횟수 0 / 0</span>`;
        return;
    }
    const targetRepsForSet = currentWorkout.sets[currentWorkout.currentSetIndex];
    dom.setInfo.innerHTML = `<span>세트 ${currentWorkout.currentSetIndex + 1} / ${currentWorkout.sets.length}</span>`;
    dom.repInfo.innerHTML = `<span>횟수 ${count} / ${targetRepsForSet}</span>`;
}

function startWorkout(workoutPlan) {
    clearAllIntervals();
    
    if (!workoutPlan || !workoutPlan.sets || workoutPlan.sets.length === 0) {
        alert("운동할 세트를 먼저 설정해주세요.");
        return;
    }
    
    if (workoutPlan.title === WORKOUT_COURSE.FREE_COURSE) {
        beepInterval = parseFloat(dom.beepIntervalInputFree.value) || 4;
    } else {
        beepInterval = parseFloat(dom.beepIntervalInput.value) || 4;
    }

    currentWorkout = { ...workoutPlan, currentSetIndex: 0 };
    count = 0;
    seconds = 0;
    minutes = 0;
    dom.timer.textContent = '00:00';
    
    dom.counter.textContent = count;
    updateProgressUI();
    isWorkoutRunning = true;
    dom.startWorkoutBtn.style.display = DISPLAY_STYLES.HIDE;
    dom.stopTimerBtn.style.display = DISPLAY_STYLES.SHOW;
    dom.resetBtn.style.display = DISPLAY_STYLES.SHOW;
    dom.dailyStats.style.display = DISPLAY_STYLES.HIDE;

    startCountdown(startWorkoutSequence);
}

function startWorkoutSequence() {
    if (workoutInterval) {
        clearInterval(workoutInterval);
        workoutInterval = null;
    }
    
    if (!currentWorkout || !currentWorkout.sets) {
        console.error('Invalid currentWorkout in startWorkoutSequence');
        return;
    }
    
    if (!isTimerRunning) { 
        timerInterval = setInterval(updateTimer, 1000); 
        isTimerRunning = true; 
    }
    
    playBeep(SOUND_FREQUENCIES.DOWN, 300);
    currentBeep = 1;
    dom.currentPhase.textContent = WORKOUT_STATES.DOWN_PHASE;
    dom.currentPhase.className = 'current-phase down';
    
    workoutInterval = setInterval(() => {
        if (!currentWorkout || !currentWorkout.sets || currentWorkout.currentSetIndex >= currentWorkout.sets.length) {
            clearInterval(workoutInterval);
            workoutInterval = null;
            return;
        }
        
        const targetRepsForSet = currentWorkout.sets[currentWorkout.currentSetIndex];
        if (count >= targetRepsForSet) {
            stopSet(true); 
            return;
        }
        
        currentBeep++;
        const isDown = currentBeep % 2 === 1;
        if (isDown) {
            playBeep(SOUND_FREQUENCIES.DOWN, 300);
            dom.currentPhase.textContent = WORKOUT_STATES.DOWN_PHASE;
            dom.currentPhase.className = 'current-phase down';
        } else {
            playBeep(SOUND_FREQUENCIES.UP, 300);
            dom.currentPhase.textContent = WORKOUT_STATES.UP_PHASE;
            dom.currentPhase.className = 'current-phase up';
            count++;
            dailyTotalPushups++;
            dom.counter.textContent = count;
            updateProgressUI();
        }
    }, beepInterval * 1000);
}

function startNextSet() {
    clearAllIntervals();
    
    if (!currentWorkout || !currentWorkout.sets) {
        console.error('Invalid currentWorkout in startNextSet');
        return;
    }
    
    count = 0;
    dom.counter.textContent = count;
    updateProgressUI();
    isWorkoutRunning = true;
    dom.startWorkoutBtn.style.display = DISPLAY_STYLES.HIDE;
    dom.stopTimerBtn.style.display = DISPLAY_STYLES.SHOW;
    dom.resetBtn.style.display = DISPLAY_STYLES.SHOW;
    
    startCountdown(startWorkoutSequence);
}

function stopSet(completed = false) {
    if (workoutInterval) {
        clearInterval(workoutInterval);
        workoutInterval = null;
    }
    
    if (completed) {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isTimerRunning = false;

        dailySets++;
        dailySessionHistory.push({ set: dailySets, reps: count });
        saveData();
        updateStatsUI();
        
        if (currentWorkout) {
            currentWorkout.currentSetIndex++;
            if (currentWorkout.currentSetIndex >= currentWorkout.sets.length) {
                dom.currentPhase.textContent = WORKOUT_STATES.COMPLETED;
                dom.stopTimerBtn.style.display = DISPLAY_STYLES.HIDE;
                dom.resetBtn.style.display = DISPLAY_STYLES.HIDE;
                dom.endSessionBtn.style.display = DISPLAY_STYLES.SHOW;
                clearAllIntervals();
            } else {
                dom.currentPhase.textContent = `세트 ${currentWorkout.currentSetIndex} 완료!`;
                dom.startWorkoutBtn.textContent = `세트 ${currentWorkout.currentSetIndex + 1} 시작`;
                dom.startWorkoutBtn.style.display = DISPLAY_STYLES.SHOW;
                dom.stopTimerBtn.style.display = DISPLAY_STYLES.HIDE;
            }
        }
        count = 0;
        dom.counter.textContent = 0;
        currentBeep = 0;
    } else { 
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        isTimerRunning = false;
        
        dom.currentPhase.textContent = WORKOUT_STATES.PAUSED;
        dom.startWorkoutBtn.textContent = BUTTON_TEXTS.RESUME_WORKOUT;
        dom.startWorkoutBtn.style.display = DISPLAY_STYLES.SHOW;
        dom.resetBtn.style.display = DISPLAY_STYLES.SHOW;
        dom.stopTimerBtn.style.display = DISPLAY_STYLES.HIDE;
    }
    isWorkoutRunning = false;
}

function resetToCourseList(targetPage = PAGE_IDS.HOME) {
    clearAllIntervals();
    
    currentWorkout = null;
    count = 0;
    seconds = 0; 
    minutes = 0; 
    currentBeep = 0;
    
    dom.timer.textContent = '00:00';
    dom.counter.textContent = 0;
    dom.startWorkoutBtn.textContent = BUTTON_TEXTS.START_WORKOUT;
    dom.startWorkoutBtn.style.display = DISPLAY_STYLES.SHOW;
    dom.stopTimerBtn.style.display = DISPLAY_STYLES.HIDE;
    dom.resetBtn.style.display = DISPLAY_STYLES.HIDE;
    dom.endSessionBtn.style.display = DISPLAY_STYLES.HIDE;
    
    dom.dailyStats.style.display = DISPLAY_STYLES.BLOCK;
    dom.freeCourseSetup.style.display = DISPLAY_STYLES.HIDE;
    dom.workoutDisplay.style.display = DISPLAY_STYLES.BLOCK;

    dom.currentPhase.textContent = WORKOUT_STATES.READY;
    dom.currentPhase.className = 'current-phase';
    updateProgressUI();
    switchPage(targetPage);
}

// ==============================================
// 페이지 관리 함수들
// ==============================================
function switchPage(targetPageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const targetPage = document.getElementById(targetPageId);
    targetPage.classList.add('active');
    dom.navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.page === targetPageId));
    
    if(targetPageId === PAGE_IDS.COUNTER) {
        updateProgressUI();
        dom.counter.textContent = count;
    }
    
    if(targetPageId === PAGE_IDS.CALENDAR) renderCalendar();
}

// ==============================================
// 코스 관리 함수들
// ==============================================
function renderCourseList() {
    dom.courseListContainer.innerHTML = '';
    
    const freeCourseCard = document.createElement('div');
    freeCourseCard.className = 'course-card';
    freeCourseCard.innerHTML = `<h3>${WORKOUT_COURSE.FREE_COURSE}</h3><p>원하는 세트와 횟수를 직접 설정하여 운동합니다.</p>`;
    freeCourseCard.addEventListener('click', setupFreeCourse);
    dom.courseListContainer.appendChild(freeCourseCard);

    for (const courseName in courseData) {
        const card = document.createElement('div');
        card.className = 'course-card';
        const description = COURSE_DESCRIPTIONS[courseName] || "체계적인 푸쉬업 훈련을 시작하세요.";
        card.innerHTML = `<h3>${courseName} 코스</h3><p>${description}</p>`;
        card.addEventListener('click', () => renderCourseDetail(courseName));
        dom.courseListContainer.appendChild(card);
    }
}

function renderCourseDetail(courseName) {
    const course = courseData[courseName];
    dom.courseDetailTitle.textContent = `${courseName} 코스`;
    dom.courseDetailContainer.innerHTML = '';
    
    for (const week in course) {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'week-container';
        const isFinalTest = week === "최종 시험";
        
        let dayButtonsHtml = course[week].map((day, index) => {
            const dayTitle = day.title || `${index + 1}일차`;
            return `<button class="day-btn ${isFinalTest ? 'final-test' : ''}" data-course="${courseName}" data-week="${week}" data-day-index="${index}">${dayTitle}</button>`;
        }).join('');

        weekDiv.innerHTML = `
            <div class="week-timeline"></div>
            <div class="week-dot"></div>
            <div class="week-content">
                <div class="week-title">${week}</div>
                <div class="day-buttons">${dayButtonsHtml}</div>
            </div>
        `;
        dom.courseDetailContainer.appendChild(weekDiv);
    }
    
    dom.courseDetailContainer.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const { course, week, dayIndex } = e.currentTarget.dataset;
            const selectedDay = courseData[course][week][dayIndex];
            const workoutPlan = {
                title: selectedDay.title || `${course} ${week} ${parseInt(dayIndex) + 1}일차`,
                sets: selectedDay.reps
            };
            showPreWorkoutModal(workoutPlan);
        });
    });
    switchPage(PAGE_IDS.COURSE_DETAIL);
}

// ==============================================
// 자유 코스 관리 함수들
// ==============================================
function updateFreeCourseSetsFromUI() {
    const repsInputs = dom.setListContainer.querySelectorAll('.set-reps-input');
    freeCourseSets = Array.from(repsInputs).map(input => parseInt(input.value) || 0);
}

function renderSetList() {
    dom.setListContainer.innerHTML = '';
    freeCourseSets.forEach((reps, index) => {
        const setRow = document.createElement('div');
        setRow.className = 'set-row';
        setRow.innerHTML = `
            <span class="set-number">${index + 1}</span>
            <input type="number" class="set-reps-input" value="${reps}" min="1">
        `;
        dom.setListContainer.appendChild(setRow);
    });
}

function setupFreeCourse() {
    switchPage(PAGE_IDS.COUNTER);
    dom.counterPageTitle.textContent = WORKOUT_COURSE.FREE_COURSE_SETUP;
    dom.freeCourseSetup.style.display = DISPLAY_STYLES.BLOCK;
    dom.workoutDisplay.style.display = DISPLAY_STYLES.HIDE;
    dom.dailyStats.style.display = DISPLAY_STYLES.HIDE; 
    renderSetList();
}

// ==============================================
// 캘린더 관리 함수들
// ==============================================
function renderCalendar() {
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || {};
    const year = calendarDate.getFullYear(); 
    const month = calendarDate.getMonth();
    dom.currentMonthEl.textContent = `${year}년 ${month + 1}월`;
    
    dom.calendarGrid.querySelectorAll('.calendar-date').forEach(el => el.remove());
    
    const firstDay = new Date(year, month, 1).getDay(); 
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        dom.calendarGrid.insertAdjacentHTML('beforeend', `<div class="calendar-date other-month"></div>`);
    }
    
    for (let date = 1; date <= lastDate; date++) {
        const dateEl = document.createElement('div'); 
        dateEl.classList.add('calendar-date'); 
        dateEl.textContent = date;
        
        const fullDate = new Date(year, month, date); 
        const dateKey = getFormattedKey(fullDate);
        
        if (allData[dateKey] && allData[dateKey].totalPushups > 0) {
            dateEl.classList.add('has-record');
        }
        
        dateEl.addEventListener('click', () => {
            document.querySelectorAll('.calendar-date.selected').forEach(el => el.classList.remove('selected'));
            dateEl.classList.add('selected');
            
            const record = allData[dateKey];
            if (record && record.totalPushups > 0) {
                let detailsHtml = `<h4>${date}일의 기록 (총 ${record.totalPushups}개)</h4>`;
                record.sessionHistory.forEach(s => { 
                    detailsHtml += `<div>세트 ${s.set}: ${s.reps}개</div>`; 
                });
                detailsHtml += `<button class="delete-record-btn" data-date-key="${dateKey}">기록 삭제</button>`;
                dom.recordDetails.innerHTML = detailsHtml;
            } else { 
                dom.recordDetails.innerHTML = `<h4>${date}일의 기록이 없습니다.</h4>`; 
            }
        });
        
        dom.calendarGrid.appendChild(dateEl);
    }
}

function deleteRecord(dateKey) {
    const allData = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || {};
    delete allData[dateKey];
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(allData));

    const todayKey = getFormattedKey(new Date());
    if (dateKey === todayKey) {
        dailyTotalPushups = 0;
        dailySets = 0;
        dailySessionHistory = [];
        updateStatsUI();
    }

    renderCalendar();
    dom.recordDetails.innerHTML = `<h4>기록이 삭제되었습니다.</h4>`;
}

// ==============================================
// 모달 관리 함수들
// ==============================================
function showPreWorkoutModal(workoutPlan) {
    dom.preWorkoutTitle.textContent = workoutPlan.title;
    
    let goalHtml = workoutPlan.sets.map((reps, index) => 
        `<div>${index + 1}세트: <strong>${reps}회</strong></div>`
    ).join('');
    
    const totalReps = workoutPlan.sets.reduce((sum, reps) => sum + reps, 0);
    goalHtml += `<p style="margin-top: 12px;">총 <strong>${totalReps}회</strong></p>`;
    dom.workoutGoal.innerHTML = goalHtml;

    dom.preWorkoutModal.style.display = DISPLAY_STYLES.FLEX;
    
    dom.preWorkoutStartBtn.addEventListener('click', function startHandler() {
        dom.preWorkoutModal.style.display = DISPLAY_STYLES.HIDE;
        dom.freeCourseSetup.style.display = DISPLAY_STYLES.HIDE;
        dom.workoutDisplay.style.display = DISPLAY_STYLES.BLOCK;
        switchPage(PAGE_IDS.COUNTER);
        startWorkout(workoutPlan);
        dom.counterPageTitle.textContent = workoutPlan.title;
        dom.preWorkoutStartBtn.removeEventListener('click', startHandler);
    }, { once: true });
}

function showDeleteConfirmModal(dateKey) {
    dom.deleteConfirmText.textContent = `${dateKey}의 기록을 정말로 삭제하시겠습니까?`;
    dom.deleteConfirmModal.style.display = DISPLAY_STYLES.FLEX;

    const confirmHandler = () => {
        deleteRecord(dateKey);
        hideDeleteConfirmModal();
    };

    const cancelHandler = () => {
        hideDeleteConfirmModal();
        dom.confirmDeleteBtn.removeEventListener('click', confirmHandler);
    };
    
    dom.confirmDeleteBtn.addEventListener('click', confirmHandler, { once: true });
    dom.cancelDeleteBtn.addEventListener('click', cancelHandler, { once: true });
}

function hideDeleteConfirmModal() {
    dom.deleteConfirmModal.style.display = DISPLAY_STYLES.HIDE;
}

// ==============================================
// 이벤트 리스너들
// ==============================================
dom.startWorkoutBtn.addEventListener('click', () => { 
    if (dom.freeCourseSetup.style.display === DISPLAY_STYLES.BLOCK) {
        const repsInputs = dom.setListContainer.querySelectorAll('.set-reps-input');
        const reps = Array.from(repsInputs).map(input => parseInt(input.value) || 0);
        
        if (reps.length === 0 || reps.every(r => r === 0)) {
            alert("운동할 세트와 횟수를 입력해주세요.");
            return;
        }

        const workoutPlan = {
            title: WORKOUT_COURSE.FREE_COURSE,
            sets: reps.filter(r => r > 0)
        };
        
        dom.freeCourseSetup.style.display = DISPLAY_STYLES.HIDE;
        dom.workoutDisplay.style.display = DISPLAY_STYLES.BLOCK;
        dom.dailyStats.style.display = DISPLAY_STYLES.HIDE;
        dom.counterPageTitle.textContent = WORKOUT_COURSE.FREE_COURSE;
        startWorkout(workoutPlan);
        return;
    }

    if (!currentWorkout) return;
    
    if (dom.startWorkoutBtn.textContent.includes('재개')) {
        dom.startWorkoutBtn.style.display = DISPLAY_STYLES.HIDE;
        dom.stopTimerBtn.style.display = DISPLAY_STYLES.SHOW;
        startCountdown(() => {
            if (!isTimerRunning) { 
                timerInterval = setInterval(updateTimer, 1000); 
                isTimerRunning = true; 
            }
            startWorkoutSequence();
        });
    } else if (dom.startWorkoutBtn.textContent.includes('세트') && dom.startWorkoutBtn.textContent.includes('시작')) {
        startNextSet();
    } else {
        startWorkout(currentWorkout);
    }
});

dom.stopTimerBtn.addEventListener('click', () => {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        dom.currentPhase.textContent = WORKOUT_STATES.PAUSED;
        dom.startWorkoutBtn.textContent = BUTTON_TEXTS.RESUME_WORKOUT;
        dom.startWorkoutBtn.style.display = DISPLAY_STYLES.SHOW;
        dom.resetBtn.style.display = DISPLAY_STYLES.SHOW;
        dom.stopTimerBtn.style.display = DISPLAY_STYLES.HIDE;
        isWorkoutRunning = false;
        return;
    }
    stopSet(false);
});

dom.endSessionBtn.addEventListener('click', () => {
    clearAllIntervals();
    
    dom.resultsTableBody.innerHTML = '';
    dailySessionHistory.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${item.set}</td><td>${item.reps}</td>`;
        dom.resultsTableBody.appendChild(row);
    });
    dom.resultsModal.style.display = DISPLAY_STYLES.FLEX;
});

dom.closeModalBtn.addEventListener('click', () => { 
    dom.resultsModal.style.display = DISPLAY_STYLES.HIDE; 
    resetToCourseList(PAGE_IDS.CALENDAR); 
});

dom.resetBtn.addEventListener('click', () => resetToCourseList());

dom.navBtns.forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.page)));

dom.prevMonthBtn.addEventListener('click', () => { 
    calendarDate.setMonth(calendarDate.getMonth() - 1); 
    renderCalendar(); 
});

dom.nextMonthBtn.addEventListener('click', () => { 
    calendarDate.setMonth(calendarDate.getMonth() + 1); 
    renderCalendar(); 
});

dom.recordDetails.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-record-btn')) {
        const dateKey = e.target.dataset.dateKey;
        showDeleteConfirmModal(dateKey);
    }
});

dom.addSetBtn.addEventListener('click', () => {
    if (freeCourseSets.length < 10) {
        updateFreeCourseSetsFromUI(); 
        freeCourseSets.push(10);
        renderSetList();
    }
});

dom.removeSetBtn.addEventListener('click', () => {
    if (freeCourseSets.length > 1) {
        updateFreeCourseSetsFromUI(); 
        freeCourseSets.pop();
        renderSetList();
    }
});

window.addEventListener('click', (event) => {
    if (event.target == dom.resultsModal) {
        dom.resultsModal.style.display = DISPLAY_STYLES.HIDE;
        resetToCourseList(PAGE_IDS.CALENDAR);
    }
    if (event.target == dom.preWorkoutModal) {
        dom.preWorkoutModal.style.display = DISPLAY_STYLES.HIDE;
    }
    if (event.target == dom.deleteConfirmModal) {
        hideDeleteConfirmModal();
    }
});

// ==============================================
// 앱 초기화
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateProgressUI();
    renderCourseList();
    switchPage(PAGE_IDS.HOME);
});