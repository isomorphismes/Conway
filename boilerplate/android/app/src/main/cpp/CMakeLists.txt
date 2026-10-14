cmake_minimum_required(VERSION 3.22.1)
project(conway LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

set(NATIVE_APP_GLUE "${ANDROID_NDK}/sources/android/native_app_glue")
get_filename_component(APPLICATION_ROOT "${CMAKE_CURRENT_LIST_DIR}/../../../../../.." ABSOLUTE)
set(AICI_ICK_ROOT "${APPLICATION_ROOT}/.ai-ci-ick" CACHE PATH "Pinned ai-ci checkout")
set(ICK_STAGE_ROOT "${APPLICATION_ROOT}/build/ick" CACHE PATH "Qualified ICK ABI stages")
include("${AICI_ICK_ROOT}/ick-android/OwnedC.cmake")
if(NOT ICK_COMPILER)
  ick_android_stage(ROOT "${ICK_STAGE_ROOT}/${ANDROID_ABI}" FORTIFY_SOURCE 2)
endif()
ick_android_objects(owned_objects NAME conway SOURCES conway.c
  INCLUDES "${NATIVE_APP_GLUE}" STANDARD 11)


add_library(
    conway
    SHARED
    ${owned_objects}
    "${NATIVE_APP_GLUE}/android_native_app_glue.c"
)

target_include_directories(conway PRIVATE "${NATIVE_APP_GLUE}")
target_link_libraries(conway android EGL GLESv3 log)
