<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:03aed2,100:feef0d&height=150&text=라보야%20놀자&fontColor=2d2d2d&fontSize=60&fontAlignY=40" />
  <h3>AI 기반 아동 감정·행동 분석 플랫폼</h3>
  <p>감정의 흐름을 데이터로 읽고, 행동의 패턴을 이해하는 서비스</p>
</div>

---

## 🧭 Overview

> **Ravo**는 아동의 음성 및 표정 데이터를 AI로 분석하여  
> 감정 상태와 행동 패턴을 부모에게 시각적인 리포트 형태로 제공하는 서비스입니다.  
> 본 저장소(`Ravo_`)는 **개발용 메인 리포지토리**이며,  
> 전시용 저장소(`Ravo_be`, `Ravo_fe`)는 아래에서 확인할 수 있습니다.

---

## 🧩 Repository Structure

| 구분 | 저장소 링크 | 주요 기술 스택 |
|------|--------------|----------------|
| ⚙️ **Backend** | [RaaVoo/ravo_back](https://github.com/RaaVoo/ravo_back) | Node.js · Express · MySQL · Python(AI) |
| 🎨 **Frontend** | [RaaVoo/ravo_front](https://github.com/RaaVoo/ravo_front) | React · Vite · Tailwind CSS · Recharts |
| 🧠 **AI Module** | *(내장)* `ravo_emotion` | OpenAI API · Emotion Classification |
| 🧩 **Main Dev Repo** | [RaaVoo/Ravo_](https://github.com/RaaVoo/Ravo_) | Fullstack Monorepo |

---

## 🛠️ Tech Stack

<div align="center">

| Frontend | Backend | AI / Infra |
|:---------:|:--------:|:-----------:|
| <img src="https://skillicons.dev/icons?i=react,vite,tailwind,js,html,css" height="45" /> | <img src="https://skillicons.dev/icons?i=nodejs,express,mysql,postman" height="45" /> | <img src="https://skillicons.dev/icons?i=python,raspberrypi,github" height="45" /> |

</div>

---

## ⚙️ Hardware Configuration

<div align="center">

<table>
  <tr>
    <th>Raspberry Pi 5</th>
    <th>Raspberry Pi Camera V2</th>
    <th>reSpeaker 2-Mics Pi HAT V2.0</th>
    <th>Raspberry Pi DAC Pro</th>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/15b276fc-1acd-4a19-83df-93c33fea25dc" width="200"/></td>
    <td><img src="https://www.devicemart.co.kr/data/goods/1/2021/11/1077951_tmp_fec8135a266941e5f9cf8470be7c62016973view.png" width="200"/></td>
    <td><img src="https://www.devicemart.co.kr/data/collect_img/kind_0/fogoods/large/1383296_1.jpg" width="200"/></td>
    <td><img src="https://www.devicemart.co.kr/data/goods/1/2023/07/13237161_tmp_4f6c1d9e827c181b2c473cee474b378d4270view.png" width="200"/></td>
  </tr>
  <tr>
    <td>프로젝트의 메인 제어 보드로, 카메라 및 오디오 입력을 처리</td>
    <td>아이의 표정 및 행동 인식용 영상 데이터 수집 카메라</td>
    <td>AI 및 음성 애플리케이션용 Raspberry Pi용 듀얼 마이크 확장 보드</td>
    <td>음성 출력 품질 향상을 위한 고음질 DAC 모듈</td>
  </tr>
</table>

</div>

---

## ✨ Key Features

- 🎙 **음성/영상 분석 리포트 생성**
- 🌤 **감정 날씨** 시각화 (긍정/부정 감정 비율)
- ☁️ **키워드 클라우드** 및 주요 감정 키워드 추출
- 👩‍👧 **부모용 요약 리포트** 자동 생성
- 🧠 **AI 음성/표정 분석** 기반 감정 분류

---
