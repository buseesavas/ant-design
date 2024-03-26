import * as React from 'react';
import classNames from 'classnames';
import { useEvent } from 'rc-util';
import pickAttrs from 'rc-util/lib/pickAttrs';

import type { InputStatus } from '../../_util/statusUtils';
import { ConfigContext } from '../../config-provider';
import useCSSVarCls from '../../config-provider/hooks/useCSSVarCls';
import useSize from '../../config-provider/hooks/useSize';
import { type SizeType } from '../../config-provider/SizeContext';
import type { Variant } from '../../form/hooks/useVariants';
import { type InputRef } from '../Input';
import useStyle from '../style/otp';
import OTPInput, { type OTPInputProps } from './OTPInput';

export interface OTPRef {
  focus?: VoidFunction;
  blur?: VoidFunction;
  nativeElement: HTMLDivElement;
}

export interface OTPProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  prefixCls?: string;
  count?: number;

  // Style
  variant?: Variant;
  rootClassName?: string;
  className?: string;
  style?: React.CSSProperties;
  size?: SizeType;

  // Values
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  formatter?: (value: string) => string;

  // Status
  disabled?: boolean;
  status?: InputStatus;
}

/**
 * 需求：
 * - 验证颜色
 */

function strToArr(str: string) {
  return str.split('');
}

const OTP = React.forwardRef<OTPRef, OTPProps>((props, ref) => {
  const {
    prefixCls: customizePrefixCls,
    count = 6,
    size: customSize,
    defaultValue,
    value,
    onChange,
    formatter,
    variant,
    disabled,
    status,
    ...restProps
  } = props;

  const { getPrefixCls, direction } = React.useContext(ConfigContext);
  const prefixCls = getPrefixCls('otp', customizePrefixCls);

  const domAttrs = pickAttrs(restProps, {
    aria: true,
    data: true,
    attr: true,
  });

  const inputSharedProps = {
    variant,
    disabled,
    status,
  };

  // ========================= Root =========================
  // Style
  const rootCls = useCSSVarCls(prefixCls);
  const [wrapCSSVar, hashId, cssVarCls] = useStyle(prefixCls, rootCls);

  // ========================= Size =========================
  const mergedSize = useSize((ctx) => customSize ?? ctx);

  // ========================= Refs =========================
  const containerRef = React.useRef<HTMLDivElement>(null);

  const refs = React.useRef<Record<number, InputRef | null>>({});

  React.useImperativeHandle(ref, () => ({
    focus: () => {
      refs.current[0]?.focus();
    },
    blur: () => {
      refs.current[0]?.blur();
    },
    nativeElement: containerRef.current!,
  }));

  // ======================== Values ========================
  const [valueCells, setValueCells] = React.useState<string[]>(strToArr(defaultValue || ''));

  React.useEffect(() => {
    if (value) {
      setValueCells(strToArr(value));
    }
  }, [value]);

  const triggerValueCellsChange = useEvent((nextValueCells: string[]) => {
    setValueCells(nextValueCells);

    // Trigger if all cells are filled
    if (
      onChange &&
      nextValueCells.length === count &&
      nextValueCells.every((c) => c) &&
      nextValueCells.some((c, index) => valueCells[index] !== c)
    ) {
      onChange(nextValueCells.join(''));
    }
  });

  const patchValue = useEvent((index: number, txt: string) => {
    let nextCells = [...valueCells];

    if (txt.length <= 1) {
      nextCells[index] = txt;
    } else {
      nextCells = nextCells.slice(0, index).concat(strToArr(txt));
    }
    nextCells = nextCells.slice(0, count);

    // Clean the last empty cell
    for (let i = nextCells.length - 1; i >= 0; i -= 1) {
      if (nextCells[i]) {
        break;
      }
      nextCells.pop();
    }

    // Format if needed
    if (formatter) {
      const formattedValue = formatter(nextCells.map((c) => c || ' ').join(''));
      nextCells = strToArr(formattedValue).map((c, i) => {
        if (c === ' ' && !nextCells[i]) {
          return nextCells[i];
        }
        return c;
      });
    }

    return nextCells;
  });

  // ======================== Change ========================
  const onInputChange: OTPInputProps['onChange'] = (index, txt) => {
    const nextCells = patchValue(index, txt);

    const nextIndex = Math.min(index + txt.length, count - 1);
    if (nextIndex !== index) {
      refs.current[nextIndex]?.focus();
    }

    triggerValueCellsChange(nextCells);
  };

  const onInputBack: OTPInputProps['onBack'] = (index) => {
    const nextIndex = index - 1;
    refs.current[nextIndex]?.focus();
  };

  const onInputNext: OTPInputProps['onNext'] = (index) => {
    const nextIndex = index + 1;
    refs.current[nextIndex]?.focus();
  };

  // ======================== Render ========================
  return wrapCSSVar(
    <div
      {...domAttrs}
      ref={containerRef}
      className={classNames(
        prefixCls,
        {
          [`${prefixCls}-sm`]: mergedSize === 'small',
          [`${prefixCls}-lg`]: mergedSize === 'large',
          [`${prefixCls}-rtl`]: direction === 'rtl',
        },
        cssVarCls,
        hashId,
      )}
    >
      {new Array(count).fill(0).map((_, index) => {
        const key = `otp-${index}`;
        const singleValue = valueCells[index] || '';

        return (
          <OTPInput
            ref={(inputEle) => {
              refs.current[index] = inputEle;
            }}
            key={key}
            index={index}
            size={mergedSize}
            htmlSize={1}
            className={`${prefixCls}-input`}
            onChange={onInputChange}
            value={singleValue}
            onBack={onInputBack}
            onNext={onInputNext}
            {...inputSharedProps}
          />
        );
      })}
    </div>,
  );
});

export default OTP;
