import {
  concat,
  generate,
  throwError,
  defer,
  timer,
  BehaviorSubject,
  of
} from 'rxjs';
import {
  catchError,
  retry,
  concatAll,
  concatMap,
  delay,
  map,
  switchMap,
  tap,
  toArray,
  exhaustMap,
  filter,
  take
} from 'rxjs/operators';

/**
 * 程序是否处于暂停状态
 */
const pauseState$ = new BehaviorSubject(false);

/**
 * 操作符，使流可暂停，可设ispausable为false来强制关闭暂停效果
 * @param {boolean} isPausable 是否强制取消暂停效果
 * @param {boolean} wait wait为true时将阻塞并存储所有输入，为false时忽略暂停期间的输入
 */
const pausable = (isPausable = true, wait = true) => source => {
  if (isPausable) {
    if (wait) {
      return source.pipe(
        concatMap(value =>
          pauseState$.pipe(
            filter(v => !v),
            take(1),
            map(() => value)
          )
        )
      );
    } else {
      return source.pipe(
        exhaustMap(value =>
          pauseState$.pipe(
            filter(v => !v),
            take(1),
            map(() => value)
          )
        )
      );
    }
  } else {
    return source;
  }
};

/**
 * 可暂停的timer
 * @param t 首次延迟
 * @param each 之后的每次输出间隔
 */
function pausableTimer(t: number, each?: number, isWait = true) {
  return timer(t, each).pipe(pausable(true, isWait));
}

const tag = (text, showValue = false) =>
  tap(v => {
    if (showValue) {
      console.log('tag', text, v);
    } else {
      console.log('tag', text);
    }
  });

const goMenuHomePage$ = defer(() => {
  return pausableTimer(2000).pipe(
    pausable(true, true),
    tap(() => {
      console.log('Home');
    }),
    delay(1000),
    switchMap(() => {
      return [1, 2];
    }),
    retry(),
    take(1),
    delay(2000),
    tag('进入主页', true)
  );
});

const task$ = generate(0, x => x < 2, x => x + 1)
  .pipe(
    concatMap(x => {
      return defer(() => {
        return throwError('xxx');
      });
    })
  )
  .pipe(
    // 监听到错误的话，打印异常并返回主页面，接着抛出一个错误
    catchError(err => {
      console.log('发生错误', err);
      return concat(goMenuHomePage$, throwError(err));
    }),
    // 收到错误就重试整个task$
    retry(2)
  )
  .subscribe(console.log);
